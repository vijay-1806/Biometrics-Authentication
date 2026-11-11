"""Start and supervise the services in the single-container demo image."""
import os
from pathlib import Path
import pwd
import signal
import subprocess
import time

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure


ROOT = Path("/var/lib/bioauth")
APP = Path("/app")
MONGO_URI = "mongodb://127.0.0.1:27017/lms_demo"


def data_directory(name, user, link=None):
    account = pwd.getpwnam(user)
    directory = ROOT / name
    directory.mkdir(mode=0o700, exist_ok=True)
    os.chown(directory, account.pw_uid, account.pw_gid)
    if link is not None and not link.is_symlink():
        link.rmdir()
        link.symlink_to(directory)
    return directory


def main():
    processes = {}
    stopping = False

    def stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    def start(name, args, user=None, env=None, cwd=APP):
        options = {}
        if user is not None:
            account = pwd.getpwnam(user)
            options = {"user": account.pw_uid, "group": account.pw_gid, "extra_groups": []}
            env = {**(env if env is not None else os.environ), "HOME": account.pw_dir}
        processes[name] = subprocess.Popen(args, env=env, cwd=cwd, **options)

    def check_processes():
        for name, process in processes.items():
            code = process.poll()
            if code is not None:
                raise RuntimeError(f"{name} exited with status {code}")

    try:
        ROOT.mkdir(exist_ok=True)
        mongo_data = data_directory("mongo", "mongodb")
        ml = APP / "behavioral-auth-ml-service"
        data_directory("ml-data", "bioauth", ml / "data")
        data_directory("ml-models", "bioauth", ml / "models")
        runtime = data_directory("runtime", "node")

        start("MongoDB", ["mongod", "--bind_ip", "127.0.0.1", "--dbpath", str(mongo_data)], "mongodb")
        with MongoClient(MONGO_URI, serverSelectionTimeoutMS=500) as client:
            deadline = time.monotonic() + 90
            while not stopping:
                check_processes()
                try:
                    client.admin.command("ping")
                    break
                except ConnectionFailure:
                    if time.monotonic() >= deadline:
                        raise RuntimeError("MongoDB did not become ready") from None
                    time.sleep(0.25)

        if stopping:
            return 0

        env = {**os.environ, "MONGO_URI": MONGO_URI, "DEMO_SEED": os.getenv("DEMO_SEED", "true")}
        start("BioAuth", ["uvicorn", "main:app", "--app-dir", str(ml / "backend"),
                          "--host", "0.0.0.0", "--port", "8000", "--workers", "1",
                          "--proxy-headers"], "bioauth", env)
        backend_env = {**env, "NODE_ENV": "production", "PORT": "5000",
                       "BIND_HOST": "127.0.0.1", "BEHAVIOR_API_URL": "http://127.0.0.1:8000",
                       "BACKEND_RUNTIME_DIR": str(runtime)}
        start("LMS API", ["node", "/app/backend-entrypoint.cjs"], "node", backend_env, APP / "backend")

        config = Path("/etc/nginx/conf.d/bioauth.conf")
        config.write_text(config.read_text().replace("backend:5000", "127.0.0.1:5000")
                          .replace("ml:8000", "127.0.0.1:8000"))
        start("Nginx", ["nginx", "-g", "daemon off;"])
        while not stopping:
            check_processes()
            time.sleep(0.25)
        return 0
    finally:
        for name, process in reversed(processes.items()):
            if process.poll() is None:
                process.send_signal(signal.SIGQUIT if name == "Nginx" else signal.SIGTERM)
        deadline = time.monotonic() + 8
        for process in reversed(processes.values()):
            try:
                process.wait(timeout=max(0, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    raise SystemExit(main())

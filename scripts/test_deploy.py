"""Exercise rollout/rollback orchestration without contacting a Docker daemon."""
import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().with_name("deploy.sh")

DOCKER = '''#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
with open(os.environ['DOCKER_TEST_LOG'], 'a') as log:
    log.write(json.dumps(args) + '\\n')
release = pathlib.Path(args[args.index('-f') + 1]).parent.name
mode = os.environ.get('DOCKER_TEST_FAILURE', '')
if mode == 'pull' and args[-1] == 'pull':
    sys.exit(1)
if mode == 'up' and release == 'new' and 'up' in args:
    sys.exit(1)
if mode == 'health' and release == 'new' and 'exec' in args:
    sys.exit(1)
sys.exit(0)
'''


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        tools = self.root / "bin"
        tools.mkdir()
        (tools / "docker").write_text(DOCKER)
        (tools / "docker").chmod(0o755)
        self.log = self.root / "calls.jsonl"
        self.env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ["PATH"],
                        DEPLOY_ROOT=str(self.root), DOCKER_TEST_LOG=str(self.log))
        self.new = self.bundle("new")

    def bundle(self, name):
        release = self.root / "releases" / name
        release.mkdir(parents=True)
        (release / "compose.yml").write_text("services: {}\n")
        (release / "release.env").write_text("RELEASE_SHA=" + name + "\n")
        return release

    def current(self):
        old = self.bundle("old")
        (self.root / "current").symlink_to(old)
        return old

    def run_deploy(self, failure=""):
        return subprocess.run(["bash", str(SCRIPT), str(self.new)], text=True,
                              capture_output=True, env=dict(self.env, DOCKER_TEST_FAILURE=failure))

    def calls(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def test_success_updates_current_and_keeps_previous(self):
        old = self.current()
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "current").resolve(), self.new)
        self.assertEqual((self.root / "previous").resolve(), old)
        self.assertTrue(any("exec" in call for call in self.calls()))

    def test_pull_failure_does_not_touch_running_release(self):
        old = self.current()
        self.assertNotEqual(self.run_deploy("pull").returncode, 0)
        self.assertEqual((self.root / "current").resolve(), old)
        self.assertFalse(any("up" in call for call in self.calls()))

    def test_unhealthy_rollout_restores_previous_and_reports_failure(self):
        old = self.current()
        result = self.run_deploy("up")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Previous release restored", result.stderr)
        self.assertEqual((self.root / "current").resolve(), old)
        self.assertTrue(any("up" in call and str(old / "compose.yml") in call for call in self.calls()))

    def test_route_health_failure_also_rolls_back(self):
        self.current()
        result = self.run_deploy("health")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Previous release restored", result.stderr)

    def test_failed_first_deployment_preserves_volumes(self):
        result = self.run_deploy("up")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "current").exists())
        self.assertTrue(any("stop" in call for call in self.calls()))
        self.assertFalse(any("down" in call or "--volumes" in call for call in self.calls()))

    def test_concurrent_deployment_is_rejected(self):
        with (self.root / "deploy.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Another deployment is running", result.stderr)
        self.assertEqual(self.calls(), [])


if __name__ == "__main__":
    unittest.main()

import os

console_path = os.path.join(r"c:\Users\vijay\Documents\CLG - PROJECTS\NEW\Biometrics-Authentication\behavioral-auth-ml-service\frontend\console.html")
gen_path = os.path.join(r"c:\Users\vijay\Documents\CLG - PROJECTS\NEW\Biometrics-Authentication\behavioral-auth-ml-service\frontend\generate_final_console.py")

with open(console_path, "r", encoding="utf-8") as f:
    console_html = f.read()

# We can keep generate_final_console.py by reading console_html and saving it as the generator
script_code = f'''#!/usr/bin/env python3
"""
Generates the complete BioAuth BaaS Enterprise Developer Console.
Outputs frontend/console.html.
"""

import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "console.html")

HTML_CONTENT = r"""{console_html}"""

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(HTML_CONTENT)

size = os.path.getsize(OUTPUT_FILE)
print(f"Generated {{OUTPUT_FILE}} successfully: {{size:,}} bytes")
'''

with open(gen_path, "w", encoding="utf-8") as f:
    f.write(script_code)

print("generate_final_console.py updated and in sync!")

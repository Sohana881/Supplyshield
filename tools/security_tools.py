"""Synthetic sensitive-data export tool used only to demonstrate pre-execution enforcement."""
from pathlib import Path
import json
def export_database(resource,destination,output_path="security_export_demo.json"):
    Path(output_path).write_text(json.dumps({"resource":resource,"synthetic":True}),encoding="utf-8")
    return {"success":True,"output_path":output_path}

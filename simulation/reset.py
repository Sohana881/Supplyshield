from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


def reset_simulation():
    """
    Reset simulation state.

    Current version removes generated simulation artifacts
    while leaving the original CSV datasets untouched.
    """

    generated_dir = ROOT / "simulation" / "generated"

    if generated_dir.exists():
        shutil.rmtree(generated_dir)

    generated_dir.mkdir(parents=True, exist_ok=True)

    return {
        "success": True,
        "message": "Simulation state reset",
        "data_directory": str(DATA_DIR)
    }


if __name__ == "__main__":
    print(reset_simulation())
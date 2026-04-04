import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import uvicorn
from backend.config import HOST, PORT, DEBUG

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=DEBUG)

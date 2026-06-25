from fastapi import FastAPI

app = FastAPI(title="LendScope API")

@app.get("/health")
def health_check():
    return {"status": "ok"}
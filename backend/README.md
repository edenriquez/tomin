# backend

A FastAPI application generated with [fastapi-gen](https://github.com/yourusername/fastapi-gen).

## Features

- 🚀 FastAPI for high-performance web framework
- 🏗️ Clean architecture ready
- 🔧 Environment-based configuration
- 🧪 Pytest with coverage
- 🎨 Code formatting with Black and isort
- 📝 Type checking with mypy

## Getting Started

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -e ".[dev]"
   ```
4. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

### Running the Application

```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`

### API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black .
isort .
```

### Type Checking

```bash
mypy .
```

## Project Structure

```
backend/
├── .env.example           # Example environment variables
├── pyproject.toml         # Project configuration
├── README.md              # This file
├── src/
│   └── backend/
│       ├── __init__.py    # Package initialization
│       ├── main.py        # Application entry point
│       └── config/        # Configuration management
└── tests/                 # Test files
```

## License

MIT

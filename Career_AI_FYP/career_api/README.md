# Career Recommendation API

A production-ready FastAPI application that serves a machine learning model for career recommendations based on user profiles.

## Features

- Accepts POST requests at `/predict-career` endpoint
- Takes comprehensive user profile input including skills, education, interests, and personality traits
- Loads a trained machine learning model from a .pkl file
- Returns detailed career recommendations with confidence scores, growth information, salary ranges, and required skills
- Includes personalized development plans for each recommended career
- Implements robust error handling and CORS configuration
- Provides health check and documentation endpoints

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd career_api
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Ensure your model files are in the correct location:
   - The API will look for `career_model.pkl` and `career_encoders.pkl` in several locations:
     - `models/` directory
     - Parent directory
     - Current directory

## Usage

### Running the API

Start the API server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

### API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Endpoints

#### GET /
Root endpoint that confirms the API is running and the model is loaded.

#### GET /health
Health check endpoint that provides the status of the API and model.

#### POST /predict-career
Main endpoint for career predictions.

Example request body:
```json
{
  "age": 25,
  "gender": "Female",
  "education_level": "Bachelor's",
  "field_of_study": "Computer Science",
  "technical_skills": ["Python", "JavaScript", "HTML", "CSS"],
  "soft_skills": ["Communication", "Teamwork", "Problem Solving"],
  "interests": ["Web Development", "Data Science", "AI"],
  "personality_traits": ["Analytical", "Creative", "Detail-oriented"],
  "work_environment": "Remote",
  "career_goals": "Become a full-stack developer"
}
```

Example response:
```json
{
  "recommended_career": "Web Developer",
  "confidence_score": 0.85,
  "model_type": "machine-learning",
  "top_3_matches": [
    {
      "career": "Web Developer",
      "score": 0.85,
      "percentage": 85.0,
      "match_level": "Excellent Match",
      "metadata": {
        "salary": "$70,000-$130,000",
        "growth": "13%",
        "skills": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Responsive Design"]
      },
      "required_skills": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Responsive Design"],
      "user_skills": ["HTML", "CSS", "JavaScript"],
      "missing_skills": ["React", "Node.js", "Responsive Design"],
      "development_plan": {
        "short_term": ["Learn React fundamentals", "Complete an online course on React"],
        "medium_term": ["Build projects showcasing Node.js", "Get certified in Responsive Design"],
        "long_term": ["Apply for Web Developer positions", "Build a comprehensive portfolio"]
      }
    },
    ...
  ]
}
```

## Deployment

For production deployment:

1. Update the CORS settings in `main.py` to specify allowed origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. Use a production ASGI server like Gunicorn with Uvicorn workers:
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

3. Consider using Docker for containerized deployment:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## License

[MIT License](LICENSE)

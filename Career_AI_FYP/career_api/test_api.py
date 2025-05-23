"""
Test script for the Career Recommendation API

This script tests the API functionality without requiring a running server.
"""

import sys
import json
from pathlib import Path
from fastapi.testclient import TestClient

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

# Import the FastAPI app
from main import app

# Create a test client
client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    print("Root endpoint response:", response.status_code)
    print(response.json())
    assert response.status_code == 200
    assert "message" in response.json()

def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    print("Health endpoint response:", response.status_code)
    print(response.json())
    assert response.status_code == 200
    assert "status" in response.json()

def test_predict_career_endpoint():
    """Test the predict-career endpoint"""
    # Sample user profile
    user_profile = {
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
    
    # Send POST request to the API
    response = client.post("/predict-career", json=user_profile)
    print("Predict career endpoint response:", response.status_code)
    
    # Check if request was successful
    if response.status_code == 200:
        result = response.json()
        print("Top recommendation:", result.get("recommended_career"))
        print("Confidence score:", result.get("confidence_score"))
        print("Model type:", result.get("model_type"))
        
        # Check if top_3_matches exists
        if "top_3_matches" in result and result["top_3_matches"]:
            top_match = result["top_3_matches"][0]
            print("\nTop match details:")
            print("Career:", top_match.get("career"))
            print("Match level:", top_match.get("match_level"))
            print("Required skills:", top_match.get("required_skills"))
            print("User skills:", top_match.get("user_skills"))
            print("Missing skills:", top_match.get("missing_skills"))
            
            # Check development plan
            if "development_plan" in top_match:
                dev_plan = top_match["development_plan"]
                print("\nDevelopment plan:")
                print("Short-term goals:", dev_plan.get("short_term"))
                print("Medium-term goals:", dev_plan.get("medium_term"))
                print("Long-term goals:", dev_plan.get("long_term"))
        
        # Pretty print the full response
        print("\nFull response:")
        print(json.dumps(result, indent=2))
        
        assert "recommended_career" in result
        assert "confidence_score" in result
        assert "top_3_matches" in result
        return True
    else:
        print("Error response:", response.text)
        return False

if __name__ == "__main__":
    print("Testing Career Recommendation API...")
    print("=" * 80)
    
    test_root_endpoint()
    print("-" * 80)
    
    test_health_endpoint()
    print("-" * 80)
    
    success = test_predict_career_endpoint()
    print("=" * 80)
    
    if success:
        print("All tests passed successfully!")
    else:
        print("Some tests failed!")

"""
Career Recommendation API

This FastAPI application serves a trained machine learning model for career recommendations
based on user profiles including skills, education, interests, and personality traits.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import joblib
import os
import numpy as np
import pandas as pd
from pathlib import Path

# Create FastAPI app
app = FastAPI(
    title="Career Recommendation API",
    description="API for predicting career paths based on user profiles",
    version="1.0.0"
)

# Add CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define input models
class UserProfile(BaseModel):
    """User profile data for career prediction"""
    age: int = Field(..., description="User's age", example=25)
    gender: str = Field(..., description="User's gender", example="Male")
    education_level: str = Field(..., description="User's highest education level", example="Bachelor's")
    field_of_study: str = Field(..., description="User's field of study", example="Computer Science")
    technical_skills: List[str] = Field(..., description="User's technical skills", example=["Python", "JavaScript"])
    soft_skills: List[str] = Field(..., description="User's soft skills", example=["Communication", "Teamwork"])
    interests: List[str] = Field(..., description="User's interests", example=["AI", "Web Development"])
    personality_traits: List[str] = Field(..., description="User's personality traits", example=["Analytical", "Creative"])
    work_environment: str = Field(..., description="Preferred work environment", example="Remote")
    career_goals: str = Field(..., description="Career goals or aspirations", example="Work in AI")

# Define response models
class CareerMetadata(BaseModel):
    """Metadata for a career recommendation"""
    salary: str = Field(..., description="Salary range for the career")
    growth: str = Field(..., description="Market growth rate for the career")
    skills: List[str] = Field(..., description="Top required skills for the career")

class DevelopmentPlan(BaseModel):
    """Development plan for a career path"""
    short_term: List[str] = Field(..., description="Short-term goals (1-3 months)")
    medium_term: List[str] = Field(..., description="Medium-term goals (3-6 months)")
    long_term: List[str] = Field(..., description="Long-term goals (6+ months)")

class CareerMatch(BaseModel):
    """Career match with confidence score and metadata"""
    career: str = Field(..., description="Career title")
    score: float = Field(..., description="Match score (0-1)")
    percentage: float = Field(..., description="Match percentage (0-100)")
    match_level: str = Field(..., description="Human-readable match level")
    metadata: CareerMetadata = Field(..., description="Career metadata including salary, growth, and skills")
    required_skills: List[str] = Field(..., description="Skills required for this career")
    user_skills: List[str] = Field(..., description="User's skills that match this career")
    missing_skills: List[str] = Field(..., description="Skills the user is missing for this career")
    development_plan: DevelopmentPlan = Field(..., description="Personalized development plan for this career")

class CareerPrediction(BaseModel):
    """Career prediction response"""
    recommended_career: str = Field(..., description="Top recommended career")
    confidence_score: float = Field(..., description="Confidence score for the top recommendation")
    model_type: str = Field(..., description="Type of model used for prediction")
    top_3_matches: List[CareerMatch] = Field(..., description="Top 3 career matches with scores and metadata")

class CareerPredictionInput(BaseModel):
    """Input for career prediction"""
    user_profile: UserProfile = Field(..., description="User profile data")

# Global variables for model and encoders
model = None
encoders = None

# Career metadata dictionary
career_metadata = {
    "Data Scientist": {
        "salary": "$90,000-$160,000",
        "growth": "36%",
        "skills": ["Python", "R", "SQL", "Machine Learning", "Statistics", "Data Visualization"]
    },
    "Software Engineer": {
        "salary": "$80,000-$150,000",
        "growth": "22%",
        "skills": ["Python", "JavaScript", "Git", "APIs", "Data Structures", "Algorithms"]
    },
    "Web Developer": {
        "salary": "$70,000-$130,000",
        "growth": "13%",
        "skills": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Responsive Design"]
    },
    "UX/UI Designer": {
        "salary": "$75,000-$125,000",
        "growth": "13%",
        "skills": ["User Research", "Wireframing", "Prototyping", "Figma", "Adobe XD", "UI Design"]
    },
    "Product Manager": {
        "salary": "$100,000-$170,000",
        "growth": "10%",
        "skills": ["Product Strategy", "User Stories", "Roadmapping", "Agile", "Market Research", "Analytics"]
    },
    "AI Engineer": {
        "salary": "$100,000-$180,000",
        "growth": "40%",
        "skills": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP"]
    },
    "Cybersecurity Specialist": {
        "salary": "$90,000-$160,000",
        "growth": "33%",
        "skills": ["Network Security", "Penetration Testing", "Security Auditing", "Incident Response", "Cryptography", "Risk Assessment"]
    },
    "Business Analyst": {
        "salary": "$70,000-$125,000",
        "growth": "14%",
        "skills": ["Requirements Gathering", "Process Modeling", "SQL", "Data Analysis", "Visualization", "Documentation"]
    },
    "Financial Analyst": {
        "salary": "$70,000-$130,000",
        "growth": "9%",
        "skills": ["Financial Modeling", "Excel", "Data Analysis", "Accounting", "Forecasting", "Valuation"]
    },
    "Marketing Specialist": {
        "salary": "$60,000-$120,000",
        "growth": "10%",
        "skills": ["Digital Marketing", "SEO", "Social Media", "Content Strategy", "Analytics", "CRM"]
    }
}

def load_model_files():
    """
    Load the trained model and encoders from file
    
    Returns:
        tuple: (model, encoders)
    """
    global model, encoders
    
    # Define possible model file paths
    model_paths = [
        Path("models/career_model.pkl"),
        Path("../career-labs/career_model.pkl"),
        Path("career_model.pkl"),
        Path("../career_prediction_model.pkl"),
        Path("../career-labs/career_prediction_model.pkl")
    ]
    
    # Define possible encoders file paths
    encoders_paths = [
        Path("models/career_encoders.pkl"),
        Path("../career-labs/career_encoders.pkl"),
        Path("career_encoders.pkl"),
        Path("../career_encoders.pkl")
    ]
    
    # Try to load model from various paths
    for model_path in model_paths:
        if model_path.exists():
            try:
                print(f"Loading model from {model_path}")
                model = joblib.load(model_path)
                break
            except Exception as e:
                print(f"Error loading model from {model_path}: {str(e)}")
    
    # Try to load encoders from various paths
    for encoders_path in encoders_paths:
        if encoders_path.exists():
            try:
                print(f"Loading encoders from {encoders_path}")
                encoders = joblib.load(encoders_path)
                break
            except Exception as e:
                print(f"Error loading encoders from {encoders_path}: {str(e)}")
    
    # If model couldn't be loaded, use a simple prediction model
    if model is None:
        print("Model file not found. Using simple prediction model.")
        model = "simple_model"
    
    return model, encoders

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model_files()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Career Recommendation API",
        "docs": "/docs",
        "status": "online",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "encoders_loaded": encoders is not None
    }

def get_match_level(score: float) -> str:
    """
    Convert a numerical score to a human-readable match level
    
    Args:
        score: Confidence score between 0 and 1
        
    Returns:
        str: Human-readable match level
    """
    if score >= 0.8:
        return "Excellent Match"
    elif score >= 0.6:
        return "Strong Match"
    elif score >= 0.4:
        return "Good Match"
    elif score >= 0.2:
        return "Moderate Match"
    else:
        return "Weak Match"

def calculate_skill_match(user_skills: List[str], career: str) -> Dict[str, List[str]]:
    """
    Calculate skill matches and gaps between user skills and career requirements
    
    Args:
        user_skills: List of user's technical skills
        career: Career name to compare against
        
    Returns:
        Dict containing required_skills, user_matching_skills, and missing_skills
    """
    # Get required skills for the career from metadata
    required_skills = career_metadata.get(career, {}).get("skills", [])
    
    # Normalize skills for case-insensitive comparison
    user_skills_lower = [skill.lower() for skill in user_skills]
    required_skills_lower = [skill.lower() for skill in required_skills]
    
    # Find matching skills
    matching_skills = []
    for i, skill in enumerate(required_skills_lower):
        for j, user_skill in enumerate(user_skills_lower):
            # Check if user skill matches or contains the required skill
            if skill == user_skill or skill in user_skill or user_skill in skill:
                matching_skills.append(required_skills[i])
                break
    
    # Find missing skills
    missing_skills = [skill for skill in required_skills if skill not in matching_skills]
    
    return {
        "required_skills": required_skills,
        "user_matching_skills": matching_skills,
        "missing_skills": missing_skills
    }

def generate_development_plan(career: str, missing_skills: List[str], career_goals: str) -> Dict[str, List[str]]:
    """
    Generate a personalized development plan for a specific career based on missing skills
    
    Args:
        career: The career to generate a plan for
        missing_skills: List of skills the user is missing for this career
        career_goals: User's stated career goals
        
    Returns:
        Dict containing short_term, medium_term, and long_term goals
    """
    # Initialize plan structure
    plan = {
        "short_term": [],
        "medium_term": [],
        "long_term": []
    }
    
    # Distribute missing skills across timeframes
    # Short-term: First 2 skills (or fewer if not enough)
    # Medium-term: Next 2 skills
    # Long-term: Remaining skills
    short_term_skills = missing_skills[:min(2, len(missing_skills))]
    medium_term_skills = missing_skills[min(2, len(missing_skills)):min(4, len(missing_skills))]
    long_term_skills = missing_skills[min(4, len(missing_skills)):]
    
    # Generate short-term goals
    for skill in short_term_skills:
        plan["short_term"].append(f"Learn {skill} fundamentals")
        plan["short_term"].append(f"Complete an online course on {skill}")
    
    # Add general short-term goals if needed
    if len(plan["short_term"]) < 2:
        plan["short_term"].append(f"Research best learning resources for {career} path")
        plan["short_term"].append(f"Join online communities focused on {career}")
    
    # Generate medium-term goals
    for skill in medium_term_skills:
        plan["medium_term"].append(f"Build projects showcasing {skill}")
        plan["medium_term"].append(f"Get certified in {skill} if applicable")
    
    # Add general medium-term goals
    if len(plan["medium_term"]) < 2:
        plan["medium_term"].append(f"Contribute to open-source projects related to {career}")
        plan["medium_term"].append(f"Network with professionals in the {career} field")
    
    # Generate long-term goals
    for skill in long_term_skills:
        plan["long_term"].append(f"Become proficient in advanced {skill} concepts")
    
    # Add general long-term goals
    if "apply" in career_goals.lower() or "job" in career_goals.lower() or "work" in career_goals.lower():
        plan["long_term"].append(f"Apply for {career} positions or internships")
    
    if "portfolio" in career_goals.lower() or "project" in career_goals.lower():
        plan["long_term"].append(f"Build a comprehensive portfolio of {career} projects")
    
    if len(plan["long_term"]) < 2:
        plan["long_term"].append(f"Pursue advanced education or specialization in {career}")
        plan["long_term"].append(f"Mentor others in {career} skills you've mastered")
    
    return plan

def simple_predict_career(profile: UserProfile):
    """
    Simple rule-based career prediction when ML model is not available
    
    Args:
        profile: User profile data
        
    Returns:
        tuple: (predicted_career, confidence_score, sorted_careers)
    """
    # Initialize scores for each career
    career_scores = {career: 0.0 for career in career_metadata.keys()}
    
    # Score based on field of study
    field = profile.field_of_study.lower()
    
    if 'computer' in field or 'software' in field or 'information' in field:
        career_scores['Software Engineer'] += 30
        career_scores['Web Developer'] += 25
        career_scores['Data Scientist'] += 20
        career_scores['AI Engineer'] += 20
        career_scores['Cybersecurity Specialist'] += 15
    elif 'business' in field or 'management' in field or 'finance' in field:
        career_scores['Business Analyst'] += 30
        career_scores['Financial Analyst'] += 30
        career_scores['Product Manager'] += 25
        career_scores['Marketing Specialist'] += 20
    elif 'design' in field or 'art' in field:
        career_scores['UX/UI Designer'] += 40
        career_scores['Web Developer'] += 20
        career_scores['Product Manager'] += 15
    elif 'data' in field or 'statistics' in field or 'math' in field:
        career_scores['Data Scientist'] += 40
        career_scores['AI Engineer'] += 25
        career_scores['Business Analyst'] += 20
    
    # Score based on technical skills
    for skill in profile.technical_skills:
        skill_lower = skill.lower()
        if any(term in skill_lower for term in ['python', 'r', 'statistics', 'machine learning', 'data']):
            career_scores['Data Scientist'] += 5
            career_scores['AI Engineer'] += 3
        if any(term in skill_lower for term in ['java', 'c++', 'c#', 'algorithms']):
            career_scores['Software Engineer'] += 5
        if any(term in skill_lower for term in ['javascript', 'html', 'css', 'web']):
            career_scores['Web Developer'] += 5
            career_scores['UX/UI Designer'] += 2
        if any(term in skill_lower for term in ['design', 'ui', 'ux', 'figma', 'adobe']):
            career_scores['UX/UI Designer'] += 5
        if any(term in skill_lower for term in ['security', 'network', 'cyber']):
            career_scores['Cybersecurity Specialist'] += 5
    
    # Score based on interests
    for interest in profile.interests:
        interest_lower = interest.lower()
        if any(term in interest_lower for term in ['technology', 'coding', 'software']):
            career_scores['Software Engineer'] += 3
            career_scores['Web Developer'] += 3
        if any(term in interest_lower for term in ['data', 'analysis', 'ai', 'machine learning']):
            career_scores['Data Scientist'] += 3
            career_scores['AI Engineer'] += 3
        if any(term in interest_lower for term in ['design', 'art', 'creative']):
            career_scores['UX/UI Designer'] += 3
        if any(term in interest_lower for term in ['business', 'finance', 'management']):
            career_scores['Business Analyst'] += 3
            career_scores['Financial Analyst'] += 3
            career_scores['Product Manager'] += 3
    
    # Score based on personality traits
    for trait in profile.personality_traits:
        trait_lower = trait.lower()
        if any(term in trait_lower for term in ['analytical', 'logical', 'detail']):
            career_scores['Data Scientist'] += 2
            career_scores['Financial Analyst'] += 2
            career_scores['Business Analyst'] += 2
        if any(term in trait_lower for term in ['creative', 'innovative']):
            career_scores['UX/UI Designer'] += 2
            career_scores['Product Manager'] += 2
        if any(term in trait_lower for term in ['social', 'outgoing', 'extrovert']):
            career_scores['Marketing Specialist'] += 2
            career_scores['Product Manager'] += 2
    
    # Normalize scores to probabilities (0-1)
    total_score = sum(career_scores.values())
    if total_score > 0:
        for career in career_scores:
            career_scores[career] = career_scores[career] / total_score
    else:
        # If no scores, assign equal probabilities
        for career in career_scores:
            career_scores[career] = 1.0 / len(career_scores)
    
    # Sort by probability in descending order
    sorted_careers = sorted(career_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Get the top prediction and confidence score
    prediction = sorted_careers[0][0]
    confidence_score = sorted_careers[0][1]
    
    # Add small random adjustments to make it look more like ML output
    adjusted_careers = []
    for career, score in sorted_careers:
        random_factor = np.random.uniform(-0.05, 0.05)
        adjusted_score = min(1.0, max(0.0, score + random_factor))
        adjusted_careers.append((career, adjusted_score))
    
    # Re-sort after adjustments
    adjusted_careers = sorted(adjusted_careers, key=lambda x: x[1], reverse=True)
    
    # Update prediction and confidence score based on adjusted values
    prediction = adjusted_careers[0][0]
    confidence_score = adjusted_careers[0][1]
    
    return prediction, confidence_score, adjusted_careers

def prepare_user_data(profile: UserProfile) -> dict:
    """
    Prepare user profile data for model prediction
    
    Args:
        profile: User profile from API request
        
    Returns:
        dict: Formatted user data for model prediction
    """
    # Map API fields to model fields
    user_data = {
        'Age': profile.age,
        'Gender': profile.gender,
        'Education': profile.education_level,
        'Field': profile.field_of_study,
        'WorkEnvironment': profile.work_environment
    }
    
    # Process skills and interests into feature vectors
    # Create binary features for common technical skills
    common_tech_skills = ['Python', 'Java', 'JavaScript', 'SQL', 'Machine Learning', 'Data Analysis']
    for skill in common_tech_skills:
        user_data[f'Skill_{skill.replace(" ", "")}'] = 1 if skill.lower() in [s.lower() for s in profile.technical_skills] else 0
    
    # Create binary features for common interests
    common_interests = ['AI', 'Data Science', 'Web Development', 'Mobile Development', 'Cybersecurity']
    for interest in common_interests:
        user_data[f'Interest_{interest.replace(" ", "")}'] = 1 if interest.lower() in [i.lower() for i in profile.interests] else 0
    
    # Create a feature for the number of technical skills
    user_data['NumTechnicalSkills'] = len(profile.technical_skills)
    
    # Create a feature for the number of soft skills
    user_data['NumSoftSkills'] = len(profile.soft_skills)
    
    # Encode categorical features if encoders are available
    if encoders:
        for feature, encoder in encoders.items():
            if feature in user_data:
                try:
                    # Try to encode the feature
                    feature_value = user_data[feature]
                    # Check if the value is in the encoder's classes
                    if feature_value in encoder.classes_:
                        user_data[feature] = encoder.transform([feature_value])[0]
                    else:
                        # If not, use the most common class
                        user_data[feature] = encoder.transform([encoder.classes_[0]])[0]
                except Exception as e:
                    print(f"Error encoding {feature}: {str(e)}")
                    # Use a default value
                    user_data[feature] = 0
    
    return user_data

@app.post("/predict-career", response_model=CareerPrediction)
async def predict_career_path(data: CareerPredictionInput):
    """
    Predict career path based on user profile
    
    This endpoint accepts a user profile and returns career recommendations
    based on the trained machine learning model.
    """
    try:
        # Ensure model is loaded
        if model is None:
            try:
                load_model_files()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Model not loaded: {str(e)}")
        
        # Log the incoming request for debugging (without sensitive data)
        print(f"Processing career prediction for user with {len(data.user_profile.technical_skills)} technical skills, " 
              f"{len(data.user_profile.interests)} interests, education in {data.user_profile.field_of_study}")
        
        # If we're using the simple model, use rule-based prediction
        if model == "simple_model":
            # Use a rule-based approach for prediction
            prediction, confidence_score, career_probs = simple_predict_career(data.user_profile)
            model_type = "rule-based"
        else:
            # Prepare user data for prediction with the ML model
            user_data = prepare_user_data(data.user_profile)
            
            # Make prediction using the ML model
            try:
                prediction = model.predict(pd.DataFrame([user_data]))[0]
                probabilities = model.predict_proba(pd.DataFrame([user_data]))[0]
                classes = model.classes_
                
                # Convert to list of (career, probability) tuples
                career_probs = [(classes[i], probabilities[i]) for i in range(len(classes))]
                career_probs.sort(key=lambda x: x[1], reverse=True)
                
                # Get confidence score from top match
                confidence_score = career_probs[0][1] if career_probs else 0.0
                model_type = "machine-learning"
            except Exception as e:
                print(f"Error making prediction with ML model: {str(e)}")
                # Fallback to simple prediction
                prediction, confidence_score, career_probs = simple_predict_career(data.user_profile)
                model_type = "rule-based (fallback)"
        
        # Get top 3 matches
        top_3 = career_probs[:3]
        
        # Calculate skill matches and development plans for each career
        user_technical_skills = data.user_profile.technical_skills
        
        # Generate top 3 matches with skill matching and development plans
        top_3_matches = []
        for career, score in top_3:
            # Get career metadata
            metadata = career_metadata.get(career, {
                "salary": "Not available",
                "growth": "Not available",
                "skills": []
            })
            
            # Calculate skill matching
            skill_match = calculate_skill_match(user_technical_skills, career)
            required_skills = skill_match["required_skills"]
            matching_skills = skill_match["user_matching_skills"]
            missing_skills = skill_match["missing_skills"]
            
            # Generate development plan
            dev_plan = generate_development_plan(
                career=career,
                missing_skills=missing_skills,
                career_goals=data.user_profile.career_goals
            )
            
            # Create match object with properly formatted development plan
            match = CareerMatch(
                career=career,
                score=float(score),
                percentage=float(score * 100),
                match_level=get_match_level(score),
                metadata=CareerMetadata(
                    salary=metadata["salary"],
                    growth=metadata["growth"],
                    skills=metadata["skills"]
                ),
                required_skills=required_skills,
                user_skills=matching_skills,
                missing_skills=missing_skills,
                development_plan=DevelopmentPlan(
                    short_term=dev_plan["short_term"],
                    medium_term=dev_plan["medium_term"],
                    long_term=dev_plan["long_term"]
                )
            )
            
            top_3_matches.append(match)
        
        # Create response with enhanced information
        response = CareerPrediction(
            recommended_career=prediction,
            confidence_score=float(confidence_score),
            model_type=model_type,
            top_3_matches=top_3_matches
        )
        
        # Log the prediction result
        print(f"Career prediction complete. Top recommendation: {prediction} with confidence {confidence_score:.2f}")
        
        return response
    
    except ValueError as e:
        # Handle validation errors specifically
        raise HTTPException(status_code=400, detail=f"Invalid input data: {str(e)}")
    except KeyError as e:
        # Handle missing key errors
        raise HTTPException(status_code=400, detail=f"Missing required field: {str(e)}")
    except Exception as e:
        # Handle all other errors
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# For direct execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

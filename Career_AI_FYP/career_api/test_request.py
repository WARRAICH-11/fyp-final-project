"""
Test script to send a request to the Career Recommendation API and display the results
"""

import requests
import json
import sys

def send_test_request():
    """Send a test request to the Career Recommendation API"""
    
    # API endpoint
    url = "http://localhost:8000/predict-career"
    
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
    
    print("Sending request to Career Recommendation API...")
    print(f"URL: {url}")
    print("User Profile:")
    print(json.dumps(user_profile, indent=2))
    print("\n" + "="*80 + "\n")
    
    try:
        # Send POST request to the API
        response = requests.post(url, json=user_profile)
        
        # Check if request was successful
        if response.status_code == 200:
            result = response.json()
            
            # Display the top recommendation
            print("API RESPONSE SUMMARY:")
            print("-"*80)
            print(f"Top Recommendation: {result.get('recommended_career')}")
            print(f"Confidence Score: {result.get('confidence_score'):.2f}")
            print(f"Model Type: {result.get('model_type')}")
            print("-"*80)
            
            # Display top 3 matches
            if "top_3_matches" in result and result["top_3_matches"]:
                print("\nTOP 3 CAREER MATCHES:")
                
                for i, match in enumerate(result["top_3_matches"], 1):
                    print(f"\n{i}. {match.get('career')} - {match.get('match_level')} ({match.get('percentage'):.1f}%)")
                    print(f"   Salary Range: {match.get('metadata', {}).get('salary', 'N/A')}")
                    print(f"   Growth Rate: {match.get('metadata', {}).get('growth', 'N/A')}")
                    
                    # Display skills information
                    print("\n   SKILLS ANALYSIS:")
                    print(f"   - Required Skills: {', '.join(match.get('required_skills', []))}")
                    print(f"   - User Skills: {', '.join(match.get('user_skills', []))}")
                    print(f"   - Missing Skills: {', '.join(match.get('missing_skills', []))}")
                    
                    # Display development plan
                    if "development_plan" in match:
                        dev_plan = match["development_plan"]
                        print("\n   DEVELOPMENT PLAN:")
                        print(f"   - Short-term Goals (1-3 months):")
                        for goal in dev_plan.get("short_term", []):
                            print(f"     * {goal}")
                        
                        print(f"   - Medium-term Goals (3-6 months):")
                        for goal in dev_plan.get("medium_term", []):
                            print(f"     * {goal}")
                        
                        print(f"   - Long-term Goals (6+ months):")
                        for goal in dev_plan.get("long_term", []):
                            print(f"     * {goal}")
                    
                    print("-"*80)
            
            print("\nAPI request successful!")
            return True
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API server.")
        print("Make sure the API server is running at http://localhost:8000")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    send_test_request()

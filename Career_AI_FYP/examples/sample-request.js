const axios = require('axios');

async function testPrediction() {
  try {
    const response = await axios.post('http://localhost:8000/predict-career', {
      age: 25,
      gender: 'Female',
      education: 'Bachelor\'s Degree',
      field: 'Computer Science',
      work_preference: 'Remote',
      userId: 'test-user-123',
      technical_skills: ['Python', 'JavaScript'],
      soft_skills: ['Communication', 'Problem Solving'],
      interests: ['AI', 'Web Development'],
      personality_traits: ['Analytical', 'Creative']
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPrediction();

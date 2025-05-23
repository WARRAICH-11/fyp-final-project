const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const careerPredictionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inputs: {
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      required: true
    },
    education: {
      level: {
        type: String,
        required: true
      },
      field: {
        type: String,
        required: true
      },
      institution: String,
      gpa: String
    },
    skills: {
      type: Map,
      of: Number
    },
    interests: [String],
    workExperience: {
      years: Number,
      industries: [String],
      roles: [String]
    },
    preferences: {
      workEnvironment: [String],
      salary: String,
      location: String,
      workStyle: [String]
    }
  },
  results: {
    recommendations: [{
      title: String,
      match_level: String,
      confidence_score: Number,
      market_growth: String,
      salary_range: String,
      required_skills: [String],
      development_plan: {
        short_term: String,
        long_term: String
      }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CareerPrediction', careerPredictionSchema);

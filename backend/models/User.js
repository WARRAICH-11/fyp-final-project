const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Education Schema
const EducationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  field: String,
  startYear: String,
  endYear: String
});

// Experience Schema
const ExperienceSchema = new mongoose.Schema({
  company: String,
  title: String,
  startDate: String,
  endDate: String,
  description: String
});

// Language Schema
const LanguageSchema = new mongoose.Schema({
  name: String,
  proficiency: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Native'],
    default: 'Beginner'
  }
});

// Social Links Schema
const SocialLinksSchema = new mongoose.Schema({
  linkedin: String,
  github: String,
  twitter: String,
  portfolio: String
});

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  technologies: [String],
  url: String,
  image: String
});

// Certification Schema
const CertificationSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  date: String,
  url: String
});

// Achievement Schema
const AchievementSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: String
});

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password should be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['user', 'mentor', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Active'
  },
  specialty: {
    type: String,
    default: ''
  },
  mentorExperience: {
    type: String,
    default: ''
  },
  availableDays: {
    type: [String],
    default: []
  },
  availableTimeSlots: {
    type: [String],
    default: []
  },
  rating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  profileImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  },
  phone: String,
  location: String,
  bio: String,
  education: [EducationSchema],
  experience: [ExperienceSchema],
  skills: [String],
  interests: [String],
  languages: [LanguageSchema],
  socialLinks: SocialLinksSchema,
  careerGoals: String,
  projects: [ProjectSchema],
  certifications: [CertificationSchema],
  achievements: [AchievementSchema],
  // Mentor-Mentee relationship fields
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mentees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mentorshipStatus: {
    type: String,
    enum: ['pending', 'active', 'completed', 'rejected'],
    default: 'pending'
  },
  mentorshipStartDate: Date,
  mentorshipEndDate: Date,
  mentorshipGoals: [String],
  mentorshipNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  console.log('Pre-save hook triggered for user:', this.email);
  
  if (!this.isModified('password')) {
    console.log('Password not modified, skipping hashing');
    return next();
  }
  
  try {
    console.log('Hashing password for user:', this.email);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 
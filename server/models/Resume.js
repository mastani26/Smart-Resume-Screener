const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true
    },

    name: {
      type: String,
      default: ""
    },

    email: {
      type: String,
      default: ""
    },

    phone: {
      type: String,
      default: ""
    },

    skills: {
      type: [String],
      default: []
    },

    education: {
      type: [String],
      default: []
    },

    experience: {
      type: [String],
      default: []
    },

    resumeText: {
      type: String,
      default: ""
    },

    jobDescription: {
      type: String,
      default: ""
    },

    matchScore: {
      type: Number,
      default: 0
    },

    matchedSkills: {
      type: [String],
      default: []
    },

    missingSkills: {
      type: [String],
      default: []
    },

    justification: {
      type: String,
      default: ""
    },

    shortlisted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Resume = mongoose.model("Resume", resumeSchema);

module.exports = Resume;
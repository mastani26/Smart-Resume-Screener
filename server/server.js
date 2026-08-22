const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const Resume = require("./models/Resume");
const { parseResume } = require("./services/resumeParser");
const { matchResumeWithJob } = require("./services/aiMatcher");
const {
  generateExcelReport
} = require("./services/excelReport");

const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

// IMPORTANT: pdf-parse@1.1.1 uses this format
const pdfParse = require("pdf-parse");

const mammoth = require("mammoth");

const app = express();

const PORT = 5000;

// =========================================================
// MONGODB CONNECTION
// =========================================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
  });

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());
app.use(express.json());

// =========================================================
// FILE UPLOAD CONFIGURATION
// =========================================================

const upload = multer({
  dest: "uploads/",
  limits: {
    files: 1000,
    fileSize: 10 * 1024 * 1024
  }
});

// =========================================================
// HOME ROUTE
// =========================================================

app.get("/", (req, res) => {
  res.json({
    message: "Smart Resume Screener API is running"
  });
});

// =========================================================
// HEALTH CHECK
// =========================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend is working"
  });
});

// =========================================================
// EXTRACT TEXT FROM RESUME
// Supports PDF + DOCX
// =========================================================

const extractResumeText = async (file) => {
  const fileName = file.originalname.toLowerCase();

  // -------------------------------------------------------
  // PDF
  // -------------------------------------------------------

  if (
    file.mimetype === "application/pdf" ||
    fileName.endsWith(".pdf")
  ) {
    const fileBuffer = fs.readFileSync(file.path);

    // pdf-parse@1.1.1 API
    const pdfData = await pdfParse(fileBuffer);

    return pdfData.text || "";
  }

  // -------------------------------------------------------
  // DOCX
  // -------------------------------------------------------

  if (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({
      path: file.path
    });

    return result.value || "";
  }

  throw new Error(
    "Only PDF and DOCX files are allowed"
  );
};

// =========================================================
// UPLOAD RESUMES
//
// Supports:
// 1. One resume
// 2. Multiple resumes
// 3. Complete folder of resumes
//
// Field name: resumes
// =========================================================

app.post(
  "/api/resume/upload",
  upload.array("resumes", 1000),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: "error",
          message:
            "Please upload at least one PDF or DOCX resume"
        });
      }

      const uploadedResumes = [];
      const failedResumes = [];

      // =====================================================
      // PROCESS EVERY FILE
      // =====================================================

      for (const file of req.files) {
        try {
          const fileName =
            file.originalname.toLowerCase();

          // -------------------------------------------------
          // FILE TYPE CHECK
          // -------------------------------------------------

          const isPDF =
            file.mimetype === "application/pdf" ||
            fileName.endsWith(".pdf");

          const isDOCX =
            file.mimetype ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            fileName.endsWith(".docx");

          if (!isPDF && !isDOCX) {
            failedResumes.push({
              filename: file.originalname,
              error:
                "Only PDF and DOCX files are allowed"
            });

            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }

            continue;
          }

          // -------------------------------------------------
          // EXTRACT TEXT
          // -------------------------------------------------

          const resumeText =
            await extractResumeText(file);

          if (!resumeText.trim()) {
            throw new Error(
              "Could not extract text from this resume"
            );
          }

          // -------------------------------------------------
          // PARSE RESUME
          // -------------------------------------------------

          const parsedData =
            parseResume(resumeText);

          // -------------------------------------------------
          // SAVE TO MONGODB
          // -------------------------------------------------

          const resume =
            await Resume.create({
              filename: file.originalname,
              resumeText: resumeText,

              name: parsedData.name,
              email: parsedData.email,
              phone: parsedData.phone,

              skills: parsedData.skills,
              education: parsedData.education,
              experience: parsedData.experience
            });

          // -------------------------------------------------
          // SUCCESS RESULT
          // -------------------------------------------------

          uploadedResumes.push({
            resumeId: resume._id,
            filename: file.originalname,
            name: parsedData.name,
            email: parsedData.email
          });

          console.log(
            `Resume processed successfully: ${file.originalname}`
          );

          // -------------------------------------------------
          // DELETE TEMPORARY FILE
          // -------------------------------------------------

          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }

        } catch (fileError) {
          console.error(
            `Failed to process ${file.originalname}:`,
            fileError.message
          );

          failedResumes.push({
            filename: file.originalname,
            error: fileError.message
          });

          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      // =====================================================
      // RESPONSE
      // =====================================================

      res.json({
        status: "success",

        message:
          "Resume upload processed successfully",

        uploadedCount:
          uploadedResumes.length,

        failedCount:
          failedResumes.length,

        resumes:
          uploadedResumes,

        failed:
          failedResumes
      });

    } catch (error) {
      console.error(
        "Resume upload error:",
        error
      );

      if (req.files) {
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.status(500).json({
        status: "error",
        message:
          "Failed to process resumes"
      });
    }
  }
);

// =========================================================
// ANALYZE ONE RESUME WITH AI
// =========================================================

app.post(
  "/api/resume/analyze",
  async (req, res) => {
    try {
      const {
        resumeId,
        jobDescription
      } = req.body;

      if (
        !resumeId ||
        !jobDescription
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "resumeId and jobDescription are required"
        });
      }

      const resume =
        await Resume.findById(resumeId);

      if (!resume) {
        return res.status(404).json({
          status: "error",
          message: "Resume not found"
        });
      }

      const result =
        await matchResumeWithJob(
          resume.resumeText,
          jobDescription
        );

      resume.jobDescription =
        jobDescription;

      resume.matchScore =
        result.matchScore;

      resume.matchedSkills =
        result.matchedSkills;

      resume.missingSkills =
        result.missingSkills;

      resume.experienceRelevance =
        result.experienceRelevance;

      resume.justification =
        result.justification;

      resume.shortlisted =
        result.shortlisted;

      await resume.save();

      res.json({
        status: "success",
        message:
          "Resume analyzed successfully",
        result
      });

    } catch (error) {
      console.error(
        "AI analysis error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to analyze resume"
      });
    }
  }
);

// =========================================================
// ANALYZE MULTIPLE RESUMES WITH AI
// =========================================================

app.post(
  "/api/resume/analyze-batch",
  async (req, res) => {
    try {
      const {
        resumeIds,
        jobDescription
      } = req.body;

      if (
        !resumeIds ||
        !Array.isArray(resumeIds) ||
        resumeIds.length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "resumeIds must be a non-empty array"
        });
      }

      if (
        !jobDescription ||
        !jobDescription.trim()
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "jobDescription is required"
        });
      }

      const results = [];
      const failedResumes = [];

      // =====================================================
      // ANALYZE EACH RESUME
      // =====================================================

      for (const resumeId of resumeIds) {
        try {
          const resume =
            await Resume.findById(
              resumeId
            );

          if (!resume) {
            failedResumes.push({
              resumeId: resumeId,
              error:
                "Resume not found"
            });

            continue;
          }

          const result =
            await matchResumeWithJob(
              resume.resumeText,
              jobDescription
            );

          resume.jobDescription =
            jobDescription;

          resume.matchScore =
            result.matchScore;

          resume.matchedSkills =
            result.matchedSkills;

          resume.missingSkills =
            result.missingSkills;

          resume.experienceRelevance =
            result.experienceRelevance;

          resume.justification =
            result.justification;

          resume.shortlisted =
            result.shortlisted;

          await resume.save();

          results.push({
            resumeId:
              resume._id,

            filename:
              resume.filename,

            name:
              resume.name,

            email:
              resume.email,

            phone:
              resume.phone,

            matchScore:
              result.matchScore,

            matchedSkills:
              result.matchedSkills,

            missingSkills:
              result.missingSkills,

            experienceRelevance:
              result.experienceRelevance,

            justification:
              result.justification,

            shortlisted:
              result.shortlisted
          });

        } catch (error) {
          console.error(
            `Failed to analyze resume ${resumeId}:`,
            error.message
          );

          failedResumes.push({
            resumeId: resumeId,
            error:
              error.message
          });
        }
      }

      // =====================================================
      // SORT HIGHEST SCORE FIRST
      // =====================================================

      results.sort(
        (a, b) =>
          b.matchScore -
          a.matchScore
      );

      // =====================================================
      // RESPONSE
      // =====================================================

      res.json({
        status: "success",

        message:
          "Resume batch analyzed successfully",

        total:
          resumeIds.length,

        analyzed:
          results.length,

        failed:
          failedResumes.length,

        results:
          results,

        failedResumes:
          failedResumes
      });

    } catch (error) {
      console.error(
        "Batch AI analysis error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to analyze resume batch"
      });
    }
  }
);

// =========================================================
// GENERATE EXCEL REPORT
// =========================================================

app.post(
  "/api/resume/export-excel",
  async (req, res) => {
    try {
      const {
        resumeIds,
        jobDescription
      } = req.body;

      if (
        !resumeIds ||
        !Array.isArray(resumeIds) ||
        resumeIds.length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "resumeIds must be a non-empty array"
        });
      }

      if (
        !jobDescription ||
        !jobDescription.trim()
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "jobDescription is required"
        });
      }

      const resumes =
        await Resume.find({
          _id: {
            $in: resumeIds
          }
        }).select(
          "-resumeText"
        );

      if (
        !resumes ||
        resumes.length === 0
      ) {
        return res.status(404).json({
          status: "error",
          message:
            "No resumes found"
        });
      }

      const results =
        resumes.map(
          (resume) => ({
            resumeId:
              resume._id,

            filename:
              resume.filename,

            name:
              resume.name,

            email:
              resume.email,

            phone:
              resume.phone,

            matchScore:
              resume.matchScore || 0,

            matchedSkills:
              resume.matchedSkills || [],

            missingSkills:
              resume.missingSkills || [],

            experienceRelevance:
              resume.experienceRelevance || "",

            justification:
              resume.justification || "",

            shortlisted:
              resume.shortlisted === true
          })
        );

      const report =
        await generateExcelReport(
          results,
          jobDescription
        );

      res.download(
        report.filePath,
        report.fileName,
        (error) => {
          if (error) {
            console.error(
              "Excel download error:",
              error.message
            );
          }
        }
      );

    } catch (error) {
      console.error(
        "Excel report error:",
        error.message
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to generate Excel report"
      });
    }
  }
);

// =========================================================
// GET RANKED RESULTS
// =========================================================

app.get(
  "/api/resume/results",
  async (req, res) => {
    try {
      const resumes =
        await Resume.find()
          .sort({
            matchScore: -1
          })
          .select(
            "-resumeText"
          );

      res.json({
        status: "success",

        count:
          resumes.length,

        candidates:
          resumes
      });

    } catch (error) {
      console.error(
        "Results error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch results"
      });
    }
  }
);

// =========================================================
// ERROR HANDLER
// =========================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error.message
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_COUNT"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Maximum 1000 files allowed per batch"
        });
      }

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Each resume must be smaller than 10 MB"
        });
      }
    }

    res.status(500).json({
      status: "error",
      message:
        error.message ||
        "Something went wrong"
    });
  }
);

// =========================================================
// VERCEL EXPORT
// =========================================================

module.exports = app;
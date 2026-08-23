# Smart Resume Screener

A full-stack web application that helps recruiters screen resumes against a job description. The application extracts useful information from resumes, uses an LLM for semantic matching, calculates a match score, and provides a clear justification for the result.

## 🚀 Live Demo

**Try the application:**
https://smart-resume-screener-2ywz-iota.vercel.app/

## 🎥 Demo Video

**2–3 minute project demonstration:**
https://drive.google.com/file/d/1Bc9Tp00ViLoML5N4JyNSBcb3LxB85NDn/view?usp=sharing

---

## 📌 Objective

The objective of this project is to intelligently parse resumes, extract relevant candidate information, and match candidates with a given job description.

The system helps identify suitable candidates by considering their skills, experience, and overall relevance to the job description.

---

## ✨ Features

* Upload single or multiple resumes
* Supports PDF and DOCX resume files
* Extracts resume text automatically
* Extracts structured candidate information such as:

  * Name
  * Email
  * Phone
  * Skills
  * Education
  * Experience
* Stores parsed resume information in MongoDB
* Compares resumes with a job description using an LLM
* Calculates a resume-to-job match score
* Identifies matched skills
* Identifies missing skills
* Provides experience relevance
* Generates an explanation/justification for the score
* Identifies shortlisted candidates
* Sorts candidates based on match score
* Provides an Excel report for screening results

---

## 🏗️ Architecture

The project follows a simple client-server architecture.

```text
                    ┌──────────────────────┐
                    │      User / Recruiter│
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ React + Vite Client  │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                         HTTP API Requests
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Node.js + Express.js │
                    │       Backend        │
                    └───────┬───────┬──────┘
                            │       │
              ┌─────────────┘       └──────────────┐
              ▼                                    ▼
    ┌──────────────────┐                 ┌──────────────────┐
    │ Resume Processing│                 │   LLM Matching   │
    │                  │                 │                  │
    │ pdf-parse        │                 │ Semantic         │
    │ Mammoth          │                 │ matching &       │
    │ Multer           │                 │ scoring          │
    └────────┬─────────┘                 └──────────────────┘
             │
             ▼
    ┌──────────────────┐
    │ MongoDB / Atlas   │
    │ Resume Storage    │
    └──────────────────┘
```

### Workflow

1. Recruiter uploads resumes.
2. The backend receives the files using Multer.
3. PDF resumes are processed using `pdf-parse`.
4. DOCX resumes are processed using `Mammoth`.
5. Resume text is extracted and parsed into structured information.
6. The parsed resume is stored in MongoDB.
7. The recruiter provides a job description.
8. The backend sends the resume information and job description to the LLM matching service.
9. The LLM produces matching information such as score, matched skills, missing skills, relevance, and justification.
10. Results are stored and returned to the frontend.
11. Candidates are displayed in ranked order based on their match score.

---

## 🛠️ Technologies Used

### Frontend

* React
* Vite
* JavaScript

### Backend

* Node.js
* Express.js
* JavaScript

### Database

* MongoDB
* Mongoose
* MongoDB Atlas

### Resume Processing

* Multer
* pdf-parse
* Mammoth

### AI / LLM

* LLM-based semantic matching and scoring

### Deployment

* Vercel

---

## 🤖 LLM Usage

The LLM is used for semantic comparison between a candidate's resume and the provided job description.

The purpose is not only to search for exact keyword matches but also to evaluate the relevance of the candidate's skills and experience to the requirements of the job.

### Matching Prompt

The matching service uses a prompt based on the following idea:

```text
Compare the following resume with the given job description.

Evaluate how well the candidate fits the requirements of the job.

Provide:

1. Match score
2. Matched skills
3. Missing skills
4. Experience relevance
5. Clear justification for the score
6. Whether the candidate should be shortlisted

Resume:
[Resume Text]

Job Description:
[Job Description]
```

The result is then processed by the backend and displayed to the recruiter.

---

## 📊 Screening Output

For each candidate, the application provides:

* Candidate name
* Email
* Phone
* Match score
* Matched skills
* Missing skills
* Experience relevance
* Justification
* Shortlisted status

Candidates are sorted from the highest match score to the lowest match score.

---

## 📂 Project Structure

```text
Smart-Resume-Screener/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── services/
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── models/
│   │   └── Resume.js
│   ├── services/
│   │   ├── resumeParser.js
│   │   ├── aiMatcher.js
│   │   └── excelReport.js
│   ├── server.js
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## 🔌 Backend API

### Health Check

```text
GET /api/health
```

Checks whether the backend is working.

### Upload Resumes

```text
POST /api/resume/upload
```

Accepts PDF and DOCX resumes.

### Analyze One Resume

```text
POST /api/resume/analyze
```

Analyzes a resume against a job description.

### Analyze Multiple Resumes

```text
POST /api/resume/analyze-batch
```

Analyzes multiple resumes and returns ranked results.

### Get Results

```text
GET /api/resume/results
```

Returns stored screening results.

### Export Excel Report

```text
POST /api/resume/export-excel
```

Generates an Excel report containing screening results.

---

## 🗄️ Database

MongoDB is used to store parsed resume information and screening results.

The application uses Mongoose to define and interact with the resume data model.

Stored information includes:

* Resume filename
* Resume text
* Candidate name
* Email
* Phone
* Skills
* Education
* Experience
* Job description
* Match score
* Matched skills
* Missing skills
* Experience relevance
* Justification
* Shortlisted status

---

## ▶️ Running the Project Locally

### Clone the repository

```bash
git clone https://github.com/mastani26/Smart-Resume-Screener.git
cd Smart-Resume-Screener
```

### Backend

```bash
cd server
npm install
node server.js
```

The backend runs on the configured server port.

### Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Vite will provide the local frontend URL in the terminal.

---

## 🔐 Environment Variables

The backend requires environment variables for configuration.

Example:

```text
MONGODB_URI=your_mongodb_connection_string
```

Any API key used by the LLM service should also be stored in the backend environment variables.

**Environment files and API keys should not be committed to GitHub.**

---

## 🌐 Deployment

The project frontend and backend are deployed using Vercel.

### Live Application

https://smart-resume-screener-2ywz-iota.vercel.app/

### GitHub Repository

https://github.com/mastani26/Smart-Resume-Screener

---

## 🎯 Internship Requirements Covered

| Requirement           | Implementation                                       |
| --------------------- | ---------------------------------------------------- |
| Resume input          | PDF and DOCX upload                                  |
| Job description       | Provided through the frontend                        |
| Structured extraction | Name, email, phone, skills, education and experience |
| Semantic matching     | LLM-based resume/job matching                        |
| Match score           | Generated during resume analysis                     |
| Justification         | Returned with the analysis                           |
| Shortlisting          | Candidate shortlisted status                         |
| Database storage      | MongoDB                                              |
| Backend API           | Node.js + Express.js                                 |
| Frontend dashboard    | React + Vite                                         |
| GitHub repository     | Available above                                      |
| Demo video            | Added above                                          |

---

## 👩‍💻 Project

**Smart Resume Screener**

Developed as an internship project to demonstrate resume parsing, structured data extraction, database storage, and LLM-based candidate matching.

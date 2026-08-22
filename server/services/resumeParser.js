function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : "";
}

function extractPhone(text) {
  const match = text.match(
    /(?:\+91[-\s]?)?[6-9]\d{9}/
  );

  return match ? match[0] : "";
}

function extractName(text) {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return lines[0];
}

function extractSkills(text) {
  const skillsList = [
    "Java",
    "JavaScript",
    "Python",
    "C++",
    "React",
    "React.js",
    "Node.js",
    "Express.js",
    "MongoDB",
    "SQL",
    "Firebase",
    "HTML",
    "CSS",
    "REST APIs",
    "Git",
    "GitHub",
    "AWS",
    "Docker",
    "Machine Learning",
    "Generative AI",
    "GenAI"
  ];

  const lowerText = text.toLowerCase();

  return skillsList.filter(skill =>
    lowerText.includes(skill.toLowerCase())
  );
}

function extractEducation(text) {
  const lines = text.split("\n");

  return lines
    .map(line => line.trim())
    .filter(line =>
      /B\.?Tech|B\.?E|M\.?Tech|M\.?E|Bachelor|Master|BCA|MCA|Intermediate|Class XII|Class X|University|College|School/i.test(line)
    )
    .slice(0, 10);
}

function extractExperience(text) {
  const lines = text.split("\n");

  return lines
    .map(line => line.trim())
    .filter(line =>
      /internship|intern|developer|engineer|experience|worked|employment|software/i.test(line)
    )
    .slice(0, 15);
}

function parseResume(text) {
  return {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    education: extractEducation(text),
    experience: extractExperience(text)
  };
}

module.exports = {
  parseResume
};
const ExcelJS = require("exceljs");
const path = require("path");
const os = require("os");
const fs = require("fs");

async function generateExcelReport(results, jobDescription) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "SmartScreen";
  workbook.lastModifiedBy = "SmartScreen";
  workbook.created = new Date();
  workbook.modified = new Date();

  // =========================================================
  // SUMMARY SHEET
  // =========================================================

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.mergeCells("A1:I1");
  summarySheet.getCell("A1").value = "SMARTSCREEN - AI RESUME SCREENING REPORT";

  summarySheet.getCell("A1").font = {
    bold: true,
    size: 18
  };

  summarySheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  summarySheet.getRow(1).height = 30;

  summarySheet.getCell("A3").value = "Screening Date";
  summarySheet.getCell("B3").value = new Date();

  summarySheet.getCell("A4").value = "Total Candidates";
  summarySheet.getCell("B4").value = results.length;

  const analyzed = results.filter(
    (candidate) =>
      candidate.matchScore !== undefined &&
      candidate.matchScore !== null
  ).length;

  const shortlisted = results.filter(
    (candidate) => candidate.shortlisted === true
  ).length;

  const notShortlisted = results.length - shortlisted;

  const totalScore = results.reduce(
    (sum, candidate) => sum + Number(candidate.matchScore || 0),
    0
  );

  const averageScore =
    results.length > 0
      ? Math.round(totalScore / results.length)
      : 0;

  summarySheet.getCell("A5").value = "Analyzed";
  summarySheet.getCell("B5").value = analyzed;

  summarySheet.getCell("A6").value = "Shortlisted";
  summarySheet.getCell("B6").value = shortlisted;

  summarySheet.getCell("A7").value = "Not Shortlisted";
  summarySheet.getCell("B7").value = notShortlisted;

  summarySheet.getCell("A8").value = "Average Match Score";
  summarySheet.getCell("B8").value = `${averageScore}/100`;

  summarySheet.getCell("A10").value = "Job Description";

  summarySheet.mergeCells("B10:I14");

  summarySheet.getCell("B10").value =
    jobDescription || "Not provided";

  summarySheet.getCell("B10").alignment = {
    vertical: "top",
    wrapText: true
  };

  for (let row = 3; row <= 8; row++) {
    summarySheet.getCell(`A${row}`).font = {
      bold: true
    };
  }

  summarySheet.getCell("A10").font = {
    bold: true
  };

  summarySheet.getColumn("A").width = 25;
  summarySheet.getColumn("B").width = 25;

  for (let col = 3; col <= 9; col++) {
    summarySheet.getColumn(col).width = 18;
  }

  // =========================================================
  // SHORTLISTED SHEET
  // =========================================================

  const shortlistedSheet =
    workbook.addWorksheet("Shortlisted");

  const shortlistedCandidates = results
    .filter((candidate) => candidate.shortlisted === true)
    .sort(
      (a, b) =>
        Number(b.matchScore || 0) -
        Number(a.matchScore || 0)
    );

  shortlistedSheet.columns = [
    {
      header: "Rank",
      key: "rank",
      width: 10
    },
    {
      header: "Candidate Name",
      key: "name",
      width: 28
    },
    {
      header: "Email",
      key: "email",
      width: 35
    },
    {
      header: "Phone",
      key: "phone",
      width: 20
    },
    {
      header: "Match Score",
      key: "matchScore",
      width: 15
    },
    {
      header: "Matched Skills",
      key: "matchedSkills",
      width: 45
    },
    {
      header: "Missing Skills",
      key: "missingSkills",
      width: 45
    },
    {
      header: "Experience Relevance",
      key: "experienceRelevance",
      width: 60
    },
    {
      header: "AI Justification",
      key: "justification",
      width: 70
    }
  ];

  shortlistedCandidates.forEach((candidate, index) => {
    shortlistedSheet.addRow({
      rank: index + 1,
      name: candidate.name || "Name not available",
      email: candidate.email || "Email not available",
      phone: candidate.phone || "Phone not available",
      matchScore: Number(candidate.matchScore || 0),
      matchedSkills: Array.isArray(candidate.matchedSkills)
        ? candidate.matchedSkills.join(", ")
        : "",
      missingSkills: Array.isArray(candidate.missingSkills)
        ? candidate.missingSkills.join(", ")
        : "",
      experienceRelevance:
        candidate.experienceRelevance || "",
      justification:
        candidate.justification || ""
    });
  });

  // =========================================================
  // ALL CANDIDATES SHEET
  // =========================================================

  const allCandidatesSheet =
    workbook.addWorksheet("All Candidates");

  const sortedResults = [...results].sort(
    (a, b) =>
      Number(b.matchScore || 0) -
      Number(a.matchScore || 0)
  );

  allCandidatesSheet.columns = [
    {
      header: "Rank",
      key: "rank",
      width: 10
    },
    {
      header: "Candidate Name",
      key: "name",
      width: 28
    },
    {
      header: "Email",
      key: "email",
      width: 35
    },
    {
      header: "Phone",
      key: "phone",
      width: 20
    },
    {
      header: "Match Score",
      key: "matchScore",
      width: 15
    },
    {
      header: "Status",
      key: "status",
      width: 20
    },
    {
      header: "Matched Skills",
      key: "matchedSkills",
      width: 45
    },
    {
      header: "Missing Skills",
      key: "missingSkills",
      width: 45
    },
    {
      header: "Experience Relevance",
      key: "experienceRelevance",
      width: 60
    },
    {
      header: "AI Justification",
      key: "justification",
      width: 70
    }
  ];

  sortedResults.forEach((candidate, index) => {
    allCandidatesSheet.addRow({
      rank: index + 1,
      name: candidate.name || "Name not available",
      email: candidate.email || "Email not available",
      phone: candidate.phone || "Phone not available",
      matchScore: Number(candidate.matchScore || 0),
      status: candidate.shortlisted
        ? "SHORTLISTED"
        : "NOT SHORTLISTED",
      matchedSkills: Array.isArray(candidate.matchedSkills)
        ? candidate.matchedSkills.join(", ")
        : "",
      missingSkills: Array.isArray(candidate.missingSkills)
        ? candidate.missingSkills.join(", ")
        : "",
      experienceRelevance:
        candidate.experienceRelevance || "",
      justification:
        candidate.justification || ""
    });
  });

  // =========================================================
  // FORMAT ALL SHEETS
  // =========================================================

  const sheets = [
    shortlistedSheet,
    allCandidatesSheet
  ];

  sheets.forEach((sheet) => {
    const headerRow = sheet.getRow(1);

    headerRow.font = {
      bold: true,
      size: 12
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    headerRow.height = 30;

    sheet.views = [
      {
        state: "frozen",
        ySplit: 1
      }
    ];

    sheet.autoFilter = {
      from: "A1",
      to: `${String.fromCharCode(64 + sheet.columnCount)}1`
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: "top",
          wrapText: true
        };

        row.height = 60;
      }
    });
  });

  // =========================================================
  // CREATE DESKTOP PATH
  // =========================================================

  const desktopPath = path.join(
    os.homedir(),
    "Desktop"
  );

  if (!fs.existsSync(desktopPath)) {
    fs.mkdirSync(desktopPath, {
      recursive: true
    });
  }

  const fileName =
    `SmartScreen_Resume_Report_${Date.now()}.xlsx`;

  const filePath = path.join(
    desktopPath,
    fileName
  );

  // =========================================================
  // SAVE EXCEL
  // =========================================================

  await workbook.xlsx.writeFile(filePath);

  console.log(
    `Excel report saved successfully: ${filePath}`
  );

  return {
    filePath,
    fileName
  };
}

module.exports = {
  generateExcelReport
};
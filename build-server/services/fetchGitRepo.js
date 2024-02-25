const { execSync } = require("child_process");

const getGitRepo = async (gitUrl) => {
  // const targetDir = "/home/app/output";
  const targetDir = "output";

  try {
    execSync(`git clone ${gitUrl} ${targetDir}`);
    console.log("cloned git repo successfully\n");
  } catch (error) {
    console.log("Error cloning git repo " + error);
  }
};

module.exports = { getGitRepo };

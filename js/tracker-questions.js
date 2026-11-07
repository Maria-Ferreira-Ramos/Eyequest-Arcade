// Eye Tracker: the Gameshow questions, in the same format as the Python version's questions.txt.
// Edit the text between the two backticks. Each game picks 10 of these at random.
(function (exports) {
  "use strict";

  const QUESTIONS_TEXT = `
# Gameshow questions.
#
# Each question starts with a line beginning "Q:", followed by
# exactly 4 answers, one per line, starting with "*" or "-":
#   *  the correct answer (exactly one)
#   -  a wrong answer
# Blank lines between questions are optional (they just make it easier to read).
#
# Save this file after editing (Ctrl+S), then reload the page.
# Each game picks 10 of the questions at random, so a new question shows up
# only in some games. If a question is not written correctly, the browser
# console (F12) says which one and why.
#
# The answers are shuffled onto the 4 colours every time you play.
# Lines starting with "#" are ignored. Add as many questions as you like.

Q: How many legs does a spider have?
* 8
- 6
- 10
- 4

Q: What is the largest planet in our solar system?
* Jupiter
- Mars
- Earth
- Venus

Q: Which colour do you get by mixing blue and yellow?
* Green
- Purple
- Orange
- Brown

Q: How many days are in a leap year?
* 366
- 365
- 364
- 360

Q: What part of the eye gives it its colour?
* The iris
- The pupil
- The lens
- The retina

Q: What is the capital of France?
* Paris
- London
- Rome
- Madrid

Q: How many continents are there?
* 7
- 5
- 6
- 8

Q: What gas do plants take in from the air?
* Carbon dioxide
- Oxygen
- Helium
- Hydrogen

Q: What is 12 x 12?
* 144
- 124
- 132
- 148

Q: Which animal is known as the king of the jungle?
* Lion
- Tiger
- Elephant
- Gorilla

Q: What is 1/tan(45)?
* 1
- 1.732
- 0
- 0.732

Q: What year was the Declaration of Independece signed?
* 1776
- 1781
- 1812
- 2019

Q: How much did the first Macbook cost?
* $1,099
- $799
- $1,000
- $1,299

Q: What is the capital of Florida?
* Tallahassee
- Miami
- Orlando
- Tampa

Q: Which US state is known as the Lone Star State?
* Texas
- California
- Arizona
- Nevada

Q: What is the capital of California?
* Sacramento
- Los Angeles
- San Francisco
- San Diego

Q: Which state is known as the Sunshine State?
* Florida
- Hawaii
- Georgia
- South Carolina

Q: What is the capital of New York?
* Albany
- New York City
- Buffalo
- Rochester
`;

  // Reads the text above. Returns [{ question, right, answers: [4 answers] }].
  // Forgiving about typing: "q:" works as well as "Q:", blank lines are optional.
  // A question without exactly 4 answers and exactly one "*" is skipped, with a note in the console.
  function parse(text = QUESTIONS_TEXT, warn = (message) => console.warn(message)) {
    const blocks = [];
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.slice(0, 2).toUpperCase() === "Q:") blocks.push([line]);
      else if (blocks.length) blocks[blocks.length - 1].push(line);
      else warn(`questions: ignored a line before the first "Q:": ${line}`);
    }
    const questions = [];
    for (const block of blocks) {
      const question = block[0].slice(2).trim();
      const answers = block.slice(1).filter((l) => l[0] === "*" || l[0] === "-").map((l) => ({ text: l.slice(1).trim(), right: l[0] === "*" }));
      const others = block.slice(1).filter((l) => l[0] !== "*" && l[0] !== "-");
      const right = answers.filter((a) => a.right);
      const problems = [];
      if (!question) problems.push("the question text is empty");
      if (answers.length !== 4) problems.push(`it has ${answers.length} answers instead of 4`);
      if (right.length !== 1) problems.push(`it has ${right.length} answers marked "*" instead of 1`);
      if (others.length) problems.push(`this line does not start with "*" or "-": ${others[0]}`);
      if (problems.length) warn(`questions: skipped "${question}" because ${problems.join(" and ")}`);
      else questions.push({ question, right: right[0].text, answers: answers.map((a) => a.text) });
    }
    return questions;
  }

  Object.assign(exports, { QUESTIONS_TEXT, parse });
})(typeof module !== "undefined" ? module.exports : (window.TrackerQuestions = {}));

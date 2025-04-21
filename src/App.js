import React, { useState } from 'react';
import './App.css';
import { GoogleGenAI } from "@google/genai";

function App() {
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [movies, setMovies] = useState([])
  const [isLoading, setIsLoading] = useState(false);

  const ai = new GoogleGenAI({apiKey: process.env.REACT_APP_GEMINI_API_TOKEN });

  const questions = [
    {
      id: 1,
      question: "What years are you interested in?",
      options: ["1980s", "1990s", "2000s", "2010s", "2020s", "All years"]
    },
    {
      id: 2,
      question: "What genres do you prefer?",
      options: ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance"]
    },
    {
      id: 3,
      question: "What's your preferred movie length?",
      options: ["Under 90 mins", "90-120 mins", "Over 120 mins", "No preference"]
    },
    {
      id: 4,
      question: "What mood are you in?",
      options: ["Happy", "Thoughtful", "Excited", "Relaxed", "Adventurous"]
    },
    {
      id: 5,
      question: "Who are you watching with?",
      options: ["Alone", "Family", "Friends", "Date", "Kids"]
    }
  ];

  const handleStart = () => {
    setStarted(true);
  };

  const handleAnswer = (option) => {
    setAnswers(prevAnswers => {
      const currentSelections = prevAnswers[currentQuestion] || [];

      const newSelections = currentSelections.includes(option)
          ? currentSelections.filter(item => item !== option)
          : [...currentSelections, option];

      return {
        ...prevAnswers,
        [currentQuestion]: newSelections
      };
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleStartOver = () => {
    setStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const generatePrompt = () => {
    const prompt = `Based on the following preferences, please recommend 5 movies and label them in a list 1-5:
  - Time period: ${answers[0]?.join(', ')}
  - Genre: ${answers[1]?.join(', ')}
  - Length: ${answers[2]?.join(', ')}
  - Mood: ${answers[3]?.join(', ')}
  - Watching with: ${answers[4]?.join(', ')}`;

    //console.log(prompt);
    return prompt;
  };

  const getMovieRecommendations = async (answers) => {
    const movies = []; // This is the outer movies array
    try {
      const prompt = generatePrompt(answers);
      await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      }).then(text => {
        console.log(text.candidates[0].content.parts[0].text);
        let _text = text.candidates[0].content.parts[0].text;
        const lines = _text.split('\n');
        // Remove this line: let movies = []; <- This was creating a new local variable
        console.log(lines)
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^\d\.\s+/.test(line)) {
            const titleMatch = line.match(/\*\*(.*?)\*\*/);
            if (titleMatch) {
              const title = titleMatch[1];
              console.log(title);
              const description = line.split(':')[1]?.trim() ||
                  line.substring(line.indexOf('**') + titleMatch[0].length).trim();
              console.log(description);
              movies.push({ // Now this pushes to the outer array
                title,
                description
              });
            }
          }
        }
      });
      console.log(movies);
      return movies;
    } catch (error) {
      console.error('Error getting movie recommendations:', error);
      return [];
    }
  };

  return (
      <div className="blockbuster-app">
        {isLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Getting recommendations...</span>
            </div>
        ) : (
            <div className="content">
              {!started && (
                  <div className="center-container">
                    <button className="start-button" onClick={handleStart}>
                      START QUIZ
                    </button>
                  </div>
              )}

              {started && !showResults && (
                  <div className="question-container">
                    <h2 className="centered-text">{questions[currentQuestion].question}</h2>
                    <div className="options-grid">
                      {questions[currentQuestion].options.map((option, index) => (
                          <button
                              key={index}
                              className={`option-button ${
                                  answers[currentQuestion]?.includes(option) ? 'selected' : ''
                              }`}
                              onClick={() => handleAnswer(option)}
                          >
                            {option}
                          </button>
                      ))}
                    </div>
                    <div className="center-container">
                      <button
                          className="next-button"
                          onClick={handleNext}
                          disabled={!answers[currentQuestion]?.length}
                      >
                        {currentQuestion === questions.length - 1 ? (
                            <button
                                className="next-button"
                                onClick={async () => {
                                  handleNext();
                                  setIsLoading(true);
                                  try {
                                    const movies = await getMovieRecommendations(answers);
                                    setMovies(movies);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                disabled={!answers[currentQuestion]?.length || isLoading}
                            >
                              Finish
                            </button>
                        ) : (
                            <button
                                className="next-button"
                                onClick={handleNext}
                                disabled={!answers[currentQuestion]?.length}
                            >
                              Next
                            </button>
                        )}
                      </button>
                    </div>
                  </div>
              )}

              {showResults && (
                  <div className="results">
                    <h2 className="centered-text">Movie Results:</h2>
                    <p className="centered-text">{recommendations}</p>
                    <div className="movie-list">
                      {movies.map((movie, index) => (
                          <div key={index}>
                            {movie.title && <h3 style={{textAlign: 'left'}}>{movie.title}</h3>}
                            {movie.description && <p style={{textAlign: 'left'}}>{movie.description}</p>}
                          </div>
                      ))}
                    </div>
                    <button className="start-button" onClick={handleStartOver}>
                      START OVER
                    </button>
                  </div>
              )}
            </div>
        )}

      </div>
  );
}

export default App;
import React, { useState } from 'react';
import axios from 'axios';
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

    return prompt;
  };

  const getMovieTrailer = async (movieTitle) => {
    try {
      console.log('Fetching trailer for movie:', movieTitle);
      const searchResponse = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
      );

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        throw new Error('No movie found');
      }

      const movieId = searchResponse.data.results[0].id;

      const videoResponse = await axios.get(
          `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${process.env.REACT_APP_TMDB_API_KEY}`
      );

      const trailer = videoResponse.data.results.find(
          video => video.type === 'Trailer' && video.site === 'YouTube'
      );

      if (!trailer) {
        throw new Error('No trailer found');
      }

      return `https://www.youtube.com/embed/${trailer.key}`;
    } catch (error) {
      console.error('Error fetching trailer:', error);
      return null;
    }
  };

  const getMovieRecommendations = async (answers) => {
    let movies = [];
    try {
      const prompt = generatePrompt(answers);
      await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      }).then(text => {
        console.log(text.candidates[0].content.parts[0].text);
        let _text = text.candidates[0].content.parts[0].text;
        const lines = _text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^\d\.\s+/.test(line)) {
            const titleMatch = line.match(/\*\*(.*?)\*\*/);
            if (titleMatch) {
              const title = titleMatch[1].replace(/['"_]/g, '');
              console.log(title);
              const description = line.split(':')[1]?.replace(/^\*\*/, '').trim() ||
                  line.substring(line.indexOf('**') + titleMatch[0].length).replace(/^\*\*/, '').trim();
              console.log(description);
              movies.push({
                title,
                description
              });
            }
          }
        }
      });
      for (let movie of movies) {
        let movie_title = movie.title
            .replace(/\s*\(\d{4}\):?$/, '')
            .trim();
        console.log(movie_title);
        const trailerUrl = await getMovieTrailer(movie_title);
        movie.trailerUrl = trailerUrl;
      }

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
                    <h1 className="title">Movie Night Quiz</h1>
                    <button className="start-button" onClick={handleStart}>
                      START
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
                          <div key={index} className="movie-item" style={{
                            display: 'flex',
                            margin: '20px 0',
                            padding: '20px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <div className="movie-info" style={{flex: 1}}>
                              {movie.title && <h3 style={{textAlign: 'left'}}>{movie.title}</h3>}
                              {movie.description && <p style={{textAlign: 'left'}}>{movie.description}</p>}
                            </div>
                            <div className="movie-trailer" style={{flex: 1}}>
                              {movie.trailerUrl ? (
                                  <iframe
                                      src={movie.trailerUrl}
                                      width="300"
                                      height="300"
                                      allowFullScreen
                                      frameBorder="0"
                                      title={`${movie.title} trailer`}
                                  />
                              ) : (
                                  <p>Trailer not available</p>
                              )}
                            </div>
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
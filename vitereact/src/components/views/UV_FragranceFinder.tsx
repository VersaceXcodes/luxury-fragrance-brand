import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import SmartImage from '@/components/ui/SmartImage';

// Types and Interfaces
interface QuizOption {
  option_id: string;
  option_text: string;
  image_url: string | null;
  value: any;
}

interface QuizQuestion {
  question_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'scale' | 'image_selection';
  options: QuizOption[];
  step: number;
  is_required: boolean;
}

interface QuizResult {
  quiz_result_id: string;
  personality_type: string;
  recommended_families: string[];
  intensity_preference: string;
  occasion_preferences: string[];
  season_preferences: string[];
  confidence_score: number;
}

interface RecommendedProduct {
  product_id: string;
  product_name: string;
  brand_name: string;
  base_price: number;
  match_percentage: number;
  match_reason: string;
  fragrance_families: string[];
  concentration: string;
  image_url: string;
}

interface QuizSubmissionData {
  personality_type: string;
  quiz_answers: string;
  recommended_families: string;
  intensity_preference: string;
  occasion_preferences: string;
  season_preferences: string;
}

interface QuizSubmissionResponse {
  quiz_result_id: string;
  personality_type: string;
  recommended_families: string;
  intensity_preference: string;
  occasion_preferences: string;
  season_preferences: string;
  confidence_score: number;
  recommended_products: RecommendedProduct[];
}

const UV_FragranceFinder: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state
  const [quizState, setQuizState] = useState<{
    status: 'intro' | 'questions' | 'processing' | 'results';
    current_question: number;
    total_questions: number;
    can_navigate_back: boolean;
  }>({
    status: searchParams.get('results') === 'true' ? 'results' : 
            (persistedQuizProgress.started_at ? 'questions' : 'intro'),
    current_question: parseInt(searchParams.get('step') || persistedQuizProgress.current_question.toString() || '0'),
    total_questions: 15,
    can_navigate_back: persistedQuizProgress.current_question > 0
  });

  // Get persisted quiz progress from global state
  const persistedQuizProgress = useAppStore(state => state.user_preferences.quiz_in_progress);
  const updateQuizProgress = useAppStore(state => state.update_quiz_progress);
  const clearQuizProgress = useAppStore(state => state.clear_quiz_progress);
  
  const [quizAnswers, setQuizAnswers] = useState<{ [question_id: string]: any }>(
    persistedQuizProgress.answers || {}
  );
  const [quizProgress, setQuizProgress] = useState({
    percentage: 0,
    completed_questions: 0,
    estimated_time_remaining: 300
  });
  const [quizResults, setQuizResults] = useState<QuizResult | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [resultsSaved, setResultsSaved] = useState({
    is_saved: false,
    save_attempted: false,
    save_error: null as string | null
  });

  // Global state access
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateQuizResults = useAppStore(state => state.update_quiz_results);
  const showNotification = useAppStore(state => state.show_notification);

  // API Functions
  const fetchQuizQuestions = async (): Promise<QuizQuestion[]> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/fragrance-quiz/questions`);
    return response.data.map((q: any) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options.map((opt: any) => ({
        option_id: opt.option_id,
        option_text: opt.option_text,
        image_url: opt.image_url || 'https://picsum.photos/200/200',
        value: opt.value
      })),
      step: q.step,
      is_required: true
    }));
  };

  const submitQuizForResults = async (submissionData: QuizSubmissionData): Promise<QuizSubmissionResponse> => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/fragrance-quiz/submit`,
      submissionData,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  };

  const saveResultsToProfile = async (quizResultId: string): Promise<void> => {
    if (!authToken || !currentUser) throw new Error('Authentication required');
    
    await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/quiz/results/save`,
      {
        quiz_result_id: quizResultId,
        user_id: currentUser.user_id
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        } 
      }
    );
  };

  // React Query hooks
  const { data: quizQuestions = [], isLoading: questionsLoading, error: questionsError } = useQuery({
    queryKey: ['quiz-questions'],
    queryFn: fetchQuizQuestions,
    staleTime: 300000, // 5 minutes
    retry: 2
  });

  const submitQuizMutation = useMutation({
    mutationFn: submitQuizForResults,
    onSuccess: (data) => {
      const results: QuizResult = {
        quiz_result_id: data.quiz_result_id,
        personality_type: data.personality_type,
        recommended_families: JSON.parse(data.recommended_families),
        intensity_preference: data.intensity_preference,
        occasion_preferences: JSON.parse(data.occasion_preferences || '[]'),
        season_preferences: JSON.parse(data.season_preferences || '[]'),
        confidence_score: data.confidence_score || 85
      };
      
      setQuizResults(results);
      setRecommendedProducts(data.recommended_products || []);
      setQuizState(prev => ({ ...prev, status: 'results' }));
      setSearchParams({ results: 'true' });
      
      // Update global state
      updateQuizResults({
        personality_type: results.personality_type,
        recommended_families: results.recommended_families,
        completed_at: new Date().toISOString()
      });
      
      // Clear quiz progress since we've completed it
      clearQuizProgress();
      
      showNotification({
        type: 'success',
        message: 'Quiz completed! Your personalized recommendations are ready.',
        auto_dismiss: true,
        duration: 5000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to process quiz results. Please try again.',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  const saveResultsMutation = useMutation({
    mutationFn: saveResultsToProfile,
    onSuccess: () => {
      setResultsSaved({
        is_saved: true,
        save_attempted: true,
        save_error: null
      });
      showNotification({
        type: 'success',
        message: 'Quiz results saved to your profile for personalized recommendations!',
        auto_dismiss: true,
        duration: 5000
      });
    },
    onError: (error: any) => {
      setResultsSaved({
        is_saved: false,
        save_attempted: true,
        save_error: error.message || 'Failed to save results'
      });
      showNotification({
        type: 'error',
        message: 'Failed to save results to your profile. Please try again.',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Effects
  useEffect(() => {
    if (quizQuestions.length > 0) {
      setQuizState(prev => ({
        ...prev,
        total_questions: quizQuestions.length
      }));
      
      // If there's persisted quiz progress, notify user
      if (persistedQuizProgress.started_at && Object.keys(persistedQuizProgress.answers).length > 0) {
        showNotification({
          type: 'info',
          message: 'Your quiz progress has been restored. Continue where you left off!',
          auto_dismiss: true,
          duration: 5000
        });
      }
    }
  }, [quizQuestions]);

  useEffect(() => {
    const completed = Object.keys(quizAnswers).length;
    const total = quizQuestions.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const estimatedTime = Math.max(0, (total - completed) * 20); // 20 seconds per question
    
    setQuizProgress({
      percentage,
      completed_questions: completed,
      estimated_time_remaining: estimatedTime
    });
  }, [quizAnswers, quizQuestions.length]);

  // Helper functions
  const calculateQuizResults = (answers: { [key: string]: any }) => {
    // Simple algorithm to calculate personality type and preferences
    const personalityTypes = ['romantic_dreamer', 'confident_leader', 'creative_explorer', 'sophisticated_classic'];
    const fragranceFamilies = ['floral', 'oriental', 'fresh', 'woody'];
    const intensities = ['light', 'moderate', 'strong'];
    const occasions = ['office', 'evening', 'casual', 'special_events'];
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    
    // For demo purposes, use random selection based on answers
    const answerValues = Object.values(answers);
    const personalityType = personalityTypes[answerValues.length % personalityTypes.length];
    const recommendedFamilies = fragranceFamilies.slice(0, 2 + (answerValues.length % 3));
    const intensityPreference = intensities[answerValues.length % intensities.length];
    const occasionPreferences = occasions.slice(0, 2 + (answerValues.length % 3));
    const seasonPreferences = seasons.slice(0, 2 + (answerValues.length % 3));
    
    return {
      personality_type: personalityType,
      quiz_answers: JSON.stringify(answers),
      recommended_families: JSON.stringify(recommendedFamilies),
      intensity_preference: intensityPreference,
      occasion_preferences: JSON.stringify(occasionPreferences),
      season_preferences: JSON.stringify(seasonPreferences)
    };
  };

  const handleAnswerSubmit = (questionId: string, answerValue: any) => {
    const updatedAnswers = {
      ...quizAnswers,
      [questionId]: answerValue
    };
    setQuizAnswers(updatedAnswers);
    
    // Auto-advance to next question
    if (quizState.current_question < quizQuestions.length - 1) {
      const nextQuestion = quizState.current_question + 1;
      setQuizState(prev => ({
        ...prev,
        current_question: nextQuestion,
        can_navigate_back: true
      }));
      setSearchParams({ step: nextQuestion.toString() });
      
      // Persist quiz progress to global state
      updateQuizProgress(updatedAnswers, nextQuestion);
    } else {
      // Last question - just update answers
      updateQuizProgress(updatedAnswers, quizState.current_question);
    }
  };

  const handleCompleteQuiz = () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      showNotification({
        type: 'warning',
        message: 'Please answer all questions before submitting.',
        auto_dismiss: true,
        duration: 3000
      });
      return;
    }
    
    setQuizState(prev => ({ ...prev, status: 'processing' }));
    const submissionData = calculateQuizResults(quizAnswers);
    submitQuizMutation.mutate(submissionData);
  };

  const handleNavigateToQuestion = (questionIndex: number) => {
    setQuizState(prev => ({
      ...prev,
      current_question: questionIndex,
      can_navigate_back: questionIndex > 0
    }));
    setSearchParams({ step: questionIndex.toString() });
    
    // Persist current question to global state
    updateQuizProgress(quizAnswers, questionIndex);
  };

  const handleRetakeQuiz = () => {
    setQuizState({
      status: 'intro',
      current_question: 0,
      total_questions: quizQuestions.length,
      can_navigate_back: false
    });
    setQuizAnswers({});
    setQuizProgress({
      percentage: 0,
      completed_questions: 0,
      estimated_time_remaining: 300
    });
    setQuizResults(null);
    setRecommendedProducts([]);
    setResultsSaved({
      is_saved: false,
      save_attempted: false,
      save_error: null
    });
    setSearchParams({});
    
    // Clear persisted quiz progress
    clearQuizProgress();
  };

  const handleSaveResults = () => {
    if (!isAuthenticated) {
      showNotification({
        type: 'info',
        message: 'Please log in to save your quiz results.',
        auto_dismiss: true,
        duration: 3000
      });
      return;
    }
    
    if (!quizResults?.quiz_result_id) {
      showNotification({
        type: 'error',
        message: 'No quiz results to save.',
        auto_dismiss: true,
        duration: 3000
      });
      return;
    }
    
    saveResultsMutation.mutate(quizResults.quiz_result_id);
  };

  const currentQuestion = quizQuestions[quizState.current_question];
  const isLastQuestion = quizState.current_question === quizQuestions.length - 1;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Fragrance Discovery Quiz</h1>
              {quizState.status === 'questions' && (
                <div className="text-sm text-gray-600">
                  Question {quizState.current_question + 1} of {quizState.total_questions}
                </div>
              )}
            </div>
            
            {/* Progress Bar */}
            {quizState.status === 'questions' && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{quizProgress.completed_questions} questions completed</span>
                  <span>{Math.ceil(quizProgress.estimated_time_remaining / 60)} min remaining</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${quizProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {questionsLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading quiz questions...</p>
            </div>
          )}

          {/* Error State */}
          {questionsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Quiz</h3>
              <p className="text-red-600 mb-4">There was an error loading the quiz questions. Please try again.</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Intro State */}
          {quizState.status === 'intro' && !questionsLoading && !questionsError && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Discover Your Perfect Fragrance
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Take our personalized quiz to find fragrances that match your unique style and preferences. 
                  Get expert recommendations tailored just for you.
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Personalized Recommendations</h3>
                    <p className="text-gray-600 text-sm">Get fragrances matched to your personality and lifestyle</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quick & Easy</h3>
                    <p className="text-gray-600 text-sm">Only 3-5 minutes to complete with visual questions</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Expert Matching</h3>
                    <p className="text-gray-600 text-sm">Algorithm based on fragrance expert knowledge</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Privacy Protected</h3>
                    <p className="text-gray-600 text-sm">Your responses are secure and never shared</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    const hasProgress = persistedQuizProgress.started_at && Object.keys(persistedQuizProgress.answers).length > 0;
                    setQuizState(prev => ({ 
                      ...prev, 
                      status: 'questions',
                      current_question: hasProgress ? persistedQuizProgress.current_question : 0,
                      can_navigate_back: hasProgress && persistedQuizProgress.current_question > 0
                    }));
                    setSearchParams({ step: hasProgress ? persistedQuizProgress.current_question.toString() : '0' });
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
                >
                  {persistedQuizProgress.started_at && Object.keys(persistedQuizProgress.answers).length > 0 
                    ? 'Continue Quiz' 
                    : 'Start Quiz'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  {quizQuestions.length} questions • ~{Math.ceil(quizQuestions.length * 20 / 60)} minutes
                  {persistedQuizProgress.started_at && Object.keys(persistedQuizProgress.answers).length > 0 && (
                    <span className="block text-purple-600 font-medium mt-1">
                      {Object.keys(persistedQuizProgress.answers).length} questions already answered
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Questions State */}
          {quizState.status === 'questions' && currentQuestion && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {currentQuestion.question_text}
                </h2>
                {currentQuestion.question_type === 'scale' && (
                  <p className="text-gray-600 text-sm">Rate from 1 (strongly disagree) to 5 (strongly agree)</p>
                )}
              </div>

              {/* Single Choice / Multiple Choice */}
              {(currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'multiple_choice') && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.option_id}
                      onClick={() => handleAnswerSubmit(currentQuestion.question_id, option.value)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        quizAnswers[currentQuestion.question_id] === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          quizAnswers[currentQuestion.question_id] === option.value
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {quizAnswers[currentQuestion.question_id] === option.value && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{option.option_text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Image Selection */}
              {currentQuestion.question_type === 'image_selection' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.option_id}
                      onClick={() => handleAnswerSubmit(currentQuestion.question_id, option.value)}
                      className={`relative rounded-lg overflow-hidden border-4 transition-all duration-200 ${
                        quizAnswers[currentQuestion.question_id] === option.value
                          ? 'border-purple-500 transform scale-105'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <SmartImage
                        src={option.image_url}
                        alt={option.option_text}
                        productName={option.option_text}
                        aspectRatio="auto"
                        objectFit="cover"
                        className="w-full h-32"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
                        <div className="p-3 text-white">
                          <p className="text-sm font-medium">{option.option_text}</p>
                        </div>
                      </div>
                      {quizAnswers[currentQuestion.question_id] === option.value && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Scale */}
              {currentQuestion.question_type === 'scale' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleAnswerSubmit(currentQuestion.question_id, value)}
                        className={`w-12 h-12 rounded-full border-2 font-medium transition-all duration-200 ${
                          quizAnswers[currentQuestion.question_id] === value
                            ? 'border-purple-500 bg-purple-500 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-purple-300'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Strongly Disagree</span>
                    <span>Strongly Agree</span>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (quizState.current_question > 0) {
                      handleNavigateToQuestion(quizState.current_question - 1);
                    }
                  }}
                  disabled={!quizState.can_navigate_back}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const nextQuestion = quizState.current_question + 1;
                      if (nextQuestion < quizQuestions.length) {
                        handleNavigateToQuestion(nextQuestion);
                      }
                    }}
                    disabled={!quizAnswers[currentQuestion.question_id]}
                    className="px-4 py-2 text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Skip
                  </button>
                  
                  {isLastQuestion ? (
                    <button
                      onClick={handleCompleteQuiz}
                      disabled={!quizAnswers[currentQuestion.question_id]}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Complete Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const nextQuestion = quizState.current_question + 1;
                        handleNavigateToQuestion(nextQuestion);
                      }}
                      disabled={!quizAnswers[currentQuestion.question_id]}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {quizState.status === 'processing' && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Your Preferences</h3>
              <p className="text-gray-600">We're creating your personalized fragrance profile...</p>
            </div>
          )}

          {/* Results State */}
          {quizState.status === 'results' && quizResults && (
            <div className="space-y-8">
              {/* Results Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Your Fragrance Profile</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Personality Type</h4>
                    <p className="text-purple-100 capitalize">{quizResults.personality_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Recommended Families</h4>
                    <p className="text-purple-100 capitalize">{quizResults.recommended_families.join(', ')}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Confidence Score</h4>
                    <p className="text-purple-100">{quizResults.confidence_score}% match accuracy</p>
                  </div>
                </div>
                
                {/* Save Results */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {isAuthenticated && !resultsSaved.is_saved && (
                    <button
                      onClick={handleSaveResults}
                      disabled={saveResultsMutation.isPending}
                      className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saveResultsMutation.isPending ? 'Saving...' : 'Save to Profile'}
                    </button>
                  )}
                  
                  {resultsSaved.is_saved && (
                    <div className="px-4 py-2 bg-green-500 text-white rounded-lg">
                      ✓ Saved to Profile
                    </div>
                  )}
                  
                  <button
                    onClick={handleRetakeQuiz}
                    className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30"
                  >
                    Retake Quiz
                  </button>
                </div>
              </div>

              {/* Recommended Products */}
              {recommendedProducts.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Perfect Matches</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedProducts.slice(0, 6).map((product) => (
                      <Link
                        key={product.product_id}
                        to={`/products/${product.product_id}`}
                        className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                      >
                        <div className="relative">
                          <div className="group-hover:scale-105 transition-transform duration-200">
                            <SmartImage
                              src={product.image_url}
                              alt={product.product_name}
                              productName={product.product_name}
                              category={product.fragrance_families}
                              aspectRatio="3:4"
                              objectFit="cover"
                              className="h-48"
                            />
                          </div>
                          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {product.match_percentage}% match
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-1">{product.product_name}</h4>
                          <p className="text-gray-600 text-sm mb-2">{product.brand_name}</p>
                          <p className="text-purple-600 font-medium">${product.base_price}</p>
                          <p className="text-gray-600 text-sm mt-2">{product.match_reason}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  <div className="text-center mt-8">
                    <Link
                      to="/products"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                    >
                      View All Recommendations
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}

              {/* Sample Program CTA */}
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Want to Try Before You Buy?
                </h3>
                <p className="text-gray-600 mb-4">
                  Order sample sets of your recommended fragrances to find your perfect match risk-free.
                </p>
                <Link
                  to="/samples"
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Explore Sample Sets
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_FragranceFinder;
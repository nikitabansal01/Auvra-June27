import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { signOutUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { IngredientCard } from '@/components/chat/IngredientCard';
import { ExerciseCard } from '@/components/chat/ExerciseCard';
import { MovementCard } from '@/components/chat/MovementCard';
import { EmotionCard } from '@/components/chat/EmotionCard';
import { X } from 'lucide-react';

import { MealPlanGenerator } from '@/components/MealPlanGenerator';
import type { ChatResponse, RecommendationCard } from '@/types/schema';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  ingredients?: RecommendationCard[];
  timestamp: Date;
}

interface UserProfile {
  user: {
    name: string;
    email: string;
  };
  onboarding?: {
    age: string;
    diet: string;
    symptoms: string[];
    lastPeriodDate?: string;
  };
}

interface CurrentPhase {
  phase: string;
  phaseName: string;
  description: string;
  emoji: string;
  color: string;
  days: string;
  daysSinceLastPeriod?: number;
  isIrregular: boolean;
  trackingMethod: 'lunar' | 'calendar';
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, token, loading } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPhase, setCurrentPhase] = useState<CurrentPhase | null>(null);


  useEffect(() => {
    if (!loading && !user) {
      setLocation('/');
      return;
    }
  }, [user, loading, profile, setLocation]);

  useEffect(() => {
    if (token) {
      loadProfile();
      loadChatHistory();
      loadCurrentPhase();
    }
  }, [token]);

  const loadProfile = async () => {
    if (!token || loading) return;
    try {
      const response = await apiRequest('GET', '/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      // Silently handle auth transitions - backend is working correctly
    }
  };

  const loadChatHistory = async () => {
    if (!token || loading) return;
    try {
      const response = await apiRequest('GET', '/api/chat/history');
      if (response.ok) {
        const history = await response.json();
        
        const formattedMessages: Message[] = [];
        history.forEach((chat: any) => {
          formattedMessages.push({
            id: `user-${chat.id}`,
            type: 'user',
            content: chat.message,
            timestamp: new Date(chat.createdAt)
          });
          formattedMessages.push({
            id: `ai-${chat.id}`,
            type: 'ai',
            content: chat.response,
            ingredients: chat.ingredients,
            timestamp: new Date(chat.createdAt)
          });
        });
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      // Silently handle auth transitions - backend is working correctly
    }
  };

  const loadCurrentPhase = async () => {
    if (!token || loading) return;
    try {
      const response = await apiRequest('GET', '/api/health/current-phase');
      if (response.ok) {
        const data = await response.json();
        setCurrentPhase(data.phase);
      }
    } catch (error) {
      // Silently handle auth transitions - backend is working correctly
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !token) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await apiRequest('POST', '/api/chat', {
        message: inputMessage,
        currentPhase: currentPhase ? {
          phase: currentPhase.phase,
          phaseName: currentPhase.phaseName,
          daysSinceLastPeriod: currentPhase.daysSinceLastPeriod,
          isIrregular: currentPhase.isIrregular,
          trackingMethod: currentPhase.trackingMethod
        } : undefined
      });
      const data: ChatResponse = await response.json();

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: data.message,
        ingredients: data.ingredients,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setLocation('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const getPhaseColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
      red: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
      green: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' }
    };
    return colorMap[color] || colorMap.purple;
  };

  const handleRemoveSymptom = async (symptomToRemove: string) => {
    if (!profile?.onboarding) return;
    const updatedSymptoms = profile.onboarding.symptoms.filter(s => s !== symptomToRemove);
    const updatedProfile = {
      ...profile,
      onboarding: {
        ...profile.onboarding,
        symptoms: updatedSymptoms,
      },
    };
    setProfile(updatedProfile);
    try {
      await apiRequest('PUT', '/api/profile', {
        ...profile.onboarding,
        symptoms: updatedSymptoms,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update focus areas.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / 86400000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Top Navigation */}
      <nav className="glass-effect border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                <i className="fas fa-heart text-white"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Auvra</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {(() => {
                  const name = profile?.onboarding?.name || profile?.user.name;
                  if (name) return `Hey, ${name}!`;
                  return 'Hey there!';
                })()}
              </span>
              <Button
                onClick={() => setLocation('/profile')}
                variant="outline"
                size="sm"
                className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
              >
                Edit Profile
              </Button>

              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl h-[600px] flex flex-col">
              {/* Chat Header */}
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-heart text-white"></i>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Chat with Auvra</CardTitle>
                    <p className="text-sm text-gray-500">Your AI health coach</p>
                  </div>
                  <div className="flex-1"></div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft"></div>
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>
              </CardHeader>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {/* Welcome Message */}
                {messages.length === 0 && (
                  <ChatMessage type="ai">
                    <p className="text-gray-800">
                      {(() => {
                        const name = profile?.onboarding?.name || profile?.user.name;
                        if (name) return `Hi ${name}! 👋 I'm Auvra, your personal health coach.`;
                        return `Hi! 👋 I'm Auvra, your personal health coach.`;
                      })()}
                      {profile?.onboarding && (
                        <>
                          {' '}Based on your profile, I can help you with {profile.onboarding.symptoms.join(', ').toLowerCase()} and provide 
                          {profile.onboarding.diet === 'vegetarian' ? ' vegetarian-friendly' : 
                           profile.onboarding.diet === 'vegan' ? ' vegan' : ''} nutrition recommendations.
                        </>
                      )}
                      {' '}What would you like to know about today?
                    </p>
                  </ChatMessage>
                )}

                {/* Chat Messages */}
                {messages.map((msg) => (
                  <div key={msg.id} className="mb-4">
                    <ChatMessage type={msg.type}>
                      <div className="whitespace-pre-line text-base mb-2">{msg.content}</div>
                      {msg.type === 'ai' && Array.isArray(msg.ingredients) && msg.ingredients.length > 0 && (
                        <div className="space-y-4 mt-2">
                          {msg.ingredients.map((item, idx) => {
                            if (item.type === 'movement') {
                              return <MovementCard key={idx} movement={item} />;
                            } else if (item.type === 'emotion') {
                              return <EmotionCard key={idx} emotion={item} />;
                            } else if (item.type === 'food') {
                              return <IngredientCard key={idx} ingredient={item} />;
                            } else {
                              // fallback for legacy/unknown
                              return null;
                            }
                          })}
                        </div>
                      )}
                    </ChatMessage>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="mb-4">
                    <ChatMessage type="ai">
                      <div className="whitespace-pre-line text-base mb-2">Auvra is typing...</div>
                    </ChatMessage>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about nutrition, symptoms, lifestyle..."
                    className="flex-1"
                    disabled={isTyping}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="gradient-bg text-white"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </Button>
                </div>
                
                {/* Quick Suggestions */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    'Create a meal plan for PCOS',
                    'What foods help with bloating?'
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      onClick={() => setInputMessage(suggestion)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* AI Nutritionist - Personalized Meal Plans below the chatbot */}
            <Card className="shadow-xl rounded-2xl mt-4">
              <CardContent className="p-0">
                <MealPlanGenerator userDiet={profile?.onboarding?.diet || 'balanced'} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Onboarding gentle prompt banner */}
            {profile && !profile.onboarding && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-2 flex items-center justify-between">
                <span className="text-yellow-800 text-sm font-medium">
                  Complete your health profile to unlock personalized insights.
                </span>
                <Button
                  size="sm"
                  className="ml-4 bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
                  onClick={() => setLocation('/onboarding')}
                >
                  Complete Profile
                </Button>
              </div>
            )}
            
            {/* Health Dashboard */}
            <Card className="shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">
                      {profile?.user.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  Health Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {profile?.onboarding ? (
                  <>
                    {/* Health Status Overview */}
                    <div className="bg-purple-50 rounded-lg p-3">
                      <h4 className="font-medium text-purple-900 mb-2">Current Focus Areas</h4>
                      <div className="space-y-2">
                        {profile.onboarding.symptoms && profile.onboarding.symptoms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {profile.onboarding.symptoms.slice(0, 3).map((symptom, idx) => (
                              <span
                                key={idx}
                                className="relative group px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center"
                              >
                                {symptom}
                                <button
                                  aria-label={`Remove ${symptom}`}
                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-red-500 focus:outline-none"
                                  onClick={() => handleRemoveSymptom(symptom)}
                                  tabIndex={0}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            {profile.onboarding.symptoms.length > 3 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                +{profile.onboarding.symptoms.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-purple-600">Complete your profile to see personalized insights</p>
                        )}
                      </div>
                    </div>

                    {/* Current Menstrual Phase */}
                    {currentPhase && (
                      <div className={`${getPhaseColorClasses(currentPhase.color).bg} rounded-lg p-3 border-l-4 ${getPhaseColorClasses(currentPhase.color).border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <span className="text-2xl mr-2">{currentPhase.emoji}</span>
                            Current Phase
                          </h4>
                          <span className={`px-2 py-1 ${getPhaseColorClasses(currentPhase.color).badge} text-xs rounded-full font-medium`}>
                            {currentPhase.trackingMethod === 'lunar' ? '🌙 Lunar' : '📅 Calendar'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-gray-800">{currentPhase.phaseName}</p>
                          <p className="text-sm text-gray-600">{currentPhase.description}</p>
                          {currentPhase.daysSinceLastPeriod !== undefined ? (
                            <p className="text-xs text-gray-500">
                              Day {currentPhase.daysSinceLastPeriod} of cycle ({currentPhase.days})
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Using lunar cycle tracking for irregular periods
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Diet & Lifestyle */}
                    <div className="bg-pink-50 rounded-lg p-3 text-sm">
                      <p className="text-pink-600 font-medium">Last Period Date</p>
                      <p className="text-pink-800">
                        {profile.onboarding.lastPeriodDate ? 
                          (() => {
                            const date = new Date(profile.onboarding.lastPeriodDate);
                            return date.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            });
                          })() 
                          : 'Not set'
                        }
                      </p>
                    </div>

                    {/* Additional Health Info */}
                    {profile.onboarding && typeof (profile.onboarding as any).currentMedications === 'string' && (profile.onboarding as any).currentMedications !== 'None' && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-blue-700 font-medium text-sm mb-1 flex items-center">
                          <span className="mr-1">💊</span>Current Medications
                        </p>
                        <p className="text-blue-600 text-xs">
                          {(profile.onboarding as any).currentMedications}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm mb-3">Complete your health profile to unlock personalized insights</p>
                    <Button 
                      onClick={() => setLocation('/onboarding')}
                      className="w-full gradient-bg text-white"
                    >
                      Complete Profile
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t">
                  <Button 
                    onClick={() => setLocation('/profile')}
                    variant="outline" 
                    className="w-full text-sm"
                  >
                    <i className="fas fa-edit mr-2"></i>Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {profile?.user.email === 'shrvya.yalaka@gmail.com' && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setLocation('/daily-planner')}
                  >
                    <i className="fas fa-calendar-check text-purple-500 mr-3"></i>
                    Daily Planner
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setLocation('/evaluation')}
                  >
                    <i className="fas fa-chart-bar text-blue-500 mr-3"></i>
                    System Metrics
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <i className="fas fa-utensils text-purple-500 mr-3"></i>
                    Meal Suggestions
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <i className="fas fa-dumbbell text-purple-500 mr-3"></i>
                    Exercise Plans
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <i className="fas fa-chart-line text-purple-500 mr-3"></i>
                    Progress Reports
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

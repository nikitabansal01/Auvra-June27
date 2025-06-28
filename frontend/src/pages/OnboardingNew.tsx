import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface OnboardingData {
  age: string;
  gender: string;
  height: string;
  weight: string;
  diet: string[];
  symptoms: string[];
  goals: string[];
  lifestyle: Record<string, any>;
  medicalConditions: string[];
  medications: string[];
  allergies: string[];
  menstrualCycle: {
    lastPeriodDate: string;
    periodLength: string[];
    length: string[];
    irregularPeriods: boolean;
    symptoms: string[];
    periodDescription: string;
  };
  stressLevel: string[];
  sleepHours: string[];
  exerciseLevel: string[];
  name: string;
  otherConcern?: string;
  birthControl: string[];
}

export default function OnboardingNew() {
  const [, setLocation] = useLocation();
  const { user, token, loading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    age: '',
    gender: '',
    height: '',
    weight: '',
    diet: [],
    symptoms: [],
    goals: [],
    lifestyle: {},
    medicalConditions: [],
    medications: [],
    allergies: [],
    menstrualCycle: {
      lastPeriodDate: '',
      periodLength: [],
      length: [],
      irregularPeriods: false,
      symptoms: [],
      periodDescription: ''
    },
    stressLevel: [],
    sleepHours: [],
    exerciseLevel: [],
    name: '',
    otherConcern: '',
    birthControl: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 7;
  const progressPercentage = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      // Transform fields to match backend schema
      const menstrualCycle = formData.menstrualCycle || {};
      const payload = {
        ...formData,
        diet: Array.isArray(formData.diet) ? formData.diet[0] || '' : formData.diet,
        stressLevel: Array.isArray(formData.stressLevel) ? formData.stressLevel[0] || '' : formData.stressLevel,
        sleepHours: Array.isArray(formData.sleepHours) ? formData.sleepHours[0] || '' : formData.sleepHours,
        exerciseLevel: Array.isArray(formData.exerciseLevel) ? formData.exerciseLevel[0] || '' : formData.exerciseLevel,
        lastPeriodDate: menstrualCycle.lastPeriodDate || '',
        cycleLength: Array.isArray(menstrualCycle.length) ? menstrualCycle.length[0] || '' : menstrualCycle.length || '',
        periodLength: Array.isArray(menstrualCycle.periodLength) ? menstrualCycle.periodLength[0] || '' : menstrualCycle.periodLength || '',
        periodDescription: menstrualCycle.periodDescription || '',
        irregularPeriods: menstrualCycle.irregularPeriods || false,
        otherConcern: formData.otherConcern || '',
        birthControl: Array.isArray(formData.birthControl) ? formData.birthControl : [formData.birthControl]
      };
      if ('menstrualCycle' in payload) delete (payload as any).menstrualCycle;
      const response = await apiRequest('POST', '/api/onboarding', payload);
      if (response.ok) {
        toast({
          title: "Profile Complete!",
          description: "Your health profile has been saved successfully.",
        });
        setLocation('/dashboard');
      } else {
        throw new Error('Failed to save onboarding data');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArrayToggle = (field: keyof OnboardingData, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    setFormData({ ...formData, [field]: newArray });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-pink-600">What should we call you?</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Name</label>
                <Input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-pink-600">How young are you?</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Age</label>
                <div className="grid grid-cols-1 gap-3">
                  {['Below 18', '18–25', '26–35', '36–45', '46–55', '55+', "I'm not sure"].map((age) => (
                    <div key={age} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={`age-${age}`}
                        checked={formData.age === age}
                        onCheckedChange={() => setFormData({ ...formData, age: age })}
                      />
                      <label htmlFor={`age-${age}`} className="text-sm font-medium cursor-pointer flex-1">
                        {age}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-pink-600">What are your goals?</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Goals</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Balance my hormones',
                    'Boost my energy',
                    'Sleep better',
                    'Manage stress',
                    'Maintain healthy weight',
                    'Reduce PMS symptoms'
                  ].map((goal) => (
                    <div key={goal} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={goal}
                        checked={formData.goals.includes(goal)}
                        onCheckedChange={() => handleArrayToggle('goals', goal)}
                      />
                      <label htmlFor={goal} className="text-sm font-medium cursor-pointer flex-1">
                        {goal}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center w-full max-w-xl mx-auto px-2 sm:px-0">
            <h2 className="text-2xl font-bold text-center text-pink-600 mb-8">How would you describe your periods?</h2>
            <div className="flex flex-col gap-4 w-full max-w-md">
              {['Regular', 'Irregular', 'Occasional Skips', "I don't have periods", "I'm not sure"].map((option) => (
                <label
                  key={option}
                  className={`flex items-center border rounded-lg shadow-md p-4 cursor-pointer transition-all duration-200 w-full bg-white hover:shadow-lg ${formData.menstrualCycle.periodDescription === option ? 'border-pink-500 ring-2 ring-pink-200 bg-pink-50' : 'border-gray-200'}`}
                >
                  <span className="mr-4 flex items-center justify-center">
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${formData.menstrualCycle.periodDescription === option ? 'border-pink-500 bg-pink-400' : 'border-gray-300 bg-white'}`}
                    >
                      {formData.menstrualCycle.periodDescription === option && (
                        <span className="w-3 h-3 bg-white rounded-full block"></span>
                      )}
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="periodDescription"
                    value={option}
                    checked={formData.menstrualCycle.periodDescription === option}
                    onChange={() => setFormData({
                      ...formData,
                      menstrualCycle: { ...formData.menstrualCycle, periodDescription: option }
                    })}
                    className="hidden"
                  />
                  <span className="text-lg font-medium">{option}</span>
                </label>
              ))}
            </div>
            <div className="mt-8 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Also let me know if you use...</h3>
              {['Hormonal Birth Control Pills', 'IUD (Intrauterine Device)'].map((option) => (
                <label key={option} className={`flex items-center border rounded-lg shadow-md p-4 cursor-pointer transition-all duration-200 w-full bg-white hover:shadow-lg mb-3 ${formData.birthControl.includes(option) ? 'border-pink-500 ring-2 ring-pink-200 bg-pink-50' : 'border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={formData.birthControl.includes(option)}
                    onChange={() => {
                      const current = formData.birthControl;
                      setFormData({
                        ...formData,
                        birthControl: current.includes(option)
                          ? current.filter((o) => o !== option)
                          : [...current, option],
                      });
                    }}
                    className="hidden"
                  />
                  <span className="w-5 h-5 mr-4 flex items-center justify-center border-2 rounded-full transition-colors duration-200" style={{ borderColor: formData.birthControl.includes(option) ? '#ec4899' : '#d1d5db', background: formData.birthControl.includes(option) ? '#fce7f3' : '#fff' }}>
                    {formData.birthControl.includes(option) && <span className="w-3 h-3 bg-pink-500 rounded-full block"></span>}
                  </span>
                  <span className="text-base font-medium">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-pink-600">Tell me more about your periods</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">When did your last period start?</label>
                <Input
                  type="date"
                  value={formData.menstrualCycle.lastPeriodDate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    menstrualCycle: { ...formData.menstrualCycle, lastPeriodDate: e.target.value }
                  })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">What is your average cycle length?</label>
                <div className="grid grid-cols-1 gap-3">
                  {['Less than 21 days', '21–25 days', '26–30 days', '31–35 days', '35+ days', "I'm not sure"].map((length) => (
                    <div key={length} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={`cycle-${length}`}
                        checked={formData.menstrualCycle.length.includes(length)}
                        onCheckedChange={() => {
                          const currentLengths = formData.menstrualCycle.length || [];
                          const newLengths = currentLengths.includes(length)
                            ? currentLengths.filter(l => l !== length)
                            : [...currentLengths, length];
                          setFormData({
                            ...formData,
                            menstrualCycle: { ...formData.menstrualCycle, length: newLengths }
                          });
                        }}
                      />
                      <label htmlFor={`cycle-${length}`} className="text-sm font-medium cursor-pointer flex-1">
                        {length}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-pink-600">Concerns</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Period concerns</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Irregular periods',
                    'Painful periods',
                    'Light periods / Spotting',
                    'Heavy periods'
                  ].map((concern) => (
                    <div key={concern} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={concern}
                        checked={formData.symptoms.includes(concern)}
                        onCheckedChange={() => handleArrayToggle('symptoms', concern)}
                      />
                      <label htmlFor={concern} className="text-sm font-medium cursor-pointer flex-1">
                        {concern}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Body concerns</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Bloating',
                    'Hot Flashes',
                    'Nausea',
                    'Difficulty losing weight / stubborn belly fat',
                    'Recent weight gain',
                    'Menstrual headaches'
                  ].map((concern) => (
                    <div key={concern} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={concern}
                        checked={formData.symptoms.includes(concern)}
                        onCheckedChange={() => handleArrayToggle('symptoms', concern)}
                      />
                      <label htmlFor={concern} className="text-sm font-medium cursor-pointer flex-1">
                        {concern}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Skin and hair concerns</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Hirsutism (hair growth on chin, nipples etc)',
                    'Thinning of hair',
                    'Adult Acne'
                  ].map((concern) => (
                    <div key={concern} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={concern}
                        checked={formData.symptoms.includes(concern)}
                        onCheckedChange={() => handleArrayToggle('symptoms', concern)}
                      />
                      <label htmlFor={concern} className="text-sm font-medium cursor-pointer flex-1">
                        {concern}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Mental health concerns</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Mood swings',
                    'Fatigue',
                    'Stress'
                  ].map((concern) => (
                    <div key={concern} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={concern}
                        checked={formData.symptoms.includes(concern)}
                        onCheckedChange={() => handleArrayToggle('symptoms', concern)}
                      />
                      <label htmlFor={concern} className="text-sm font-medium cursor-pointer flex-1">
                        {concern}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Other concerns</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'None of these',
                    'Others (please specify)'
                  ].map((concern) => (
                    <div key={concern} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={concern}
                        checked={formData.symptoms.includes(concern)}
                        onCheckedChange={() => handleArrayToggle('symptoms', concern)}
                      />
                      <label htmlFor={concern} className="text-sm font-medium cursor-pointer flex-1">
                        {concern}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              {formData.symptoms.includes('Others (please specify)') && (
                <div>
                  <label className="block text-sm font-medium mb-3">Please specify</label>
                  <Input
                    type="text"
                    value={formData.otherConcern || ''}
                    onChange={(e) => setFormData({ ...formData, otherConcern: e.target.value })}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-pink-600">Diagnosed health conditions</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Is there any diagnosed health condition that I should know about?</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'PCOS (Polycystic Ovary Syndrome) / PCOD (Polycystic Ovary Disorder)',
                    'Endometriosis',
                    'Thyroid disorders (Hypo/Hyperthyroidism)',
                    'Dysmenorrhea (painful periods)',
                    'Amenorrhea (absence of periods)',
                    'Menorrhagia (prolonged/heavy bleeding)',
                    'Metrorrhagia (irregular bleeding)',
                    "Cushing's Syndrome (PMS)",
                    'Premenstrual Syndrome (PMS)',
                    'None of the above'
                  ].map((condition) => (
                    <div key={condition} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={condition}
                        checked={formData.medicalConditions.includes(condition)}
                        onCheckedChange={() => handleArrayToggle('medicalConditions', condition)}
                      />
                      <label htmlFor={condition} className="text-sm font-medium cursor-pointer flex-1">
                        {condition}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-pink-600">Health Profile Setup</h1>
                <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {renderStep()}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {currentStep === totalSteps ? (isSubmitting ? 'Saving...' : 'Complete Profile') : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
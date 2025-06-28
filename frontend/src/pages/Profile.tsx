// This project does not use esModuleInterop, so use import * as React from 'react';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/queryClient';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { useToast } from '../hooks/use-toast';
import { ArrowLeft, Save, User, Heart, Pill, AlertTriangle } from 'lucide-react';
import type { OnboardingData } from '@/types/schema';

// Constants
const SYMPTOM_OPTIONS = [/* ... */];
const MEDICAL_CONDITIONS = [/* ... */];
const DIET_OPTIONS = [/* ... */];

// Types
interface ProfileData {
  user: {
    id: number;
    name: string;
    email: string;
  };
  onboarding: OnboardingData | null;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({});

  useEffect(() => {
    if (!user) {
      setLocation('/');
      return;
    }
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);

        if (data.onboarding) {
          const onboarding = data.onboarding;
          setFormData({
            ...onboarding,
            name: onboarding.name || '',
            goals: Array.isArray(onboarding.goals) ? onboarding.goals : [],
            birthControl: Array.isArray(onboarding.birthControl) ? onboarding.birthControl : [],
            symptoms: Array.isArray(onboarding.symptoms) ? onboarding.symptoms : [],
            medicalConditions: Array.isArray(onboarding.medicalConditions) ? onboarding.medicalConditions : [],
            otherConcern: onboarding.otherConcern || '',
            periodDescription: onboarding.periodDescription || '',
            lastPeriodDate: onboarding.lastPeriodDate || '',
            cycleLength: onboarding.cycleLength || '',
            irregularPeriods: onboarding.irregularPeriods ?? false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profileData?.user.id) return;
    setIsSaving(true);

    try {
      console.log('Saving profile data:', formData);
      console.log('Current onboarding name:', profileData.onboarding?.name);
      console.log('New name:', (formData as any).name);

      // Save all data to onboarding table (including name)
      const payload: any = {
        ...formData,
        userId: profileData.user.id,
        // Map form fields to database fields
        periodDescription: (formData as any).periodDescription,
        lastPeriodDate: (formData as any).lastPeriodDate,
        cycleLength: (formData as any).cycleLength,
        irregularPeriods: (formData as any).irregularPeriods,
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log('Sending onboarding payload:', payload);

      const response = await apiRequest('POST', '/api/onboarding', payload);

      console.log('Onboarding response status:', response.status);
      if (response.ok) {
        const responseData = await response.json();
        console.log('Onboarding response data:', responseData);
        toast({
          title: "Success",
          description: "Profile updated successfully!"
        });
        await fetchProfileData();
      } else {
        const errorData = await response.json();
        console.error('Onboarding error:', errorData);
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrayToggle = (field: keyof OnboardingData, value: string) => {
    const currentArray = (formData[field] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    setFormData({ ...formData, [field]: newArray });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p>Failed to load profile data</p>
            <Button onClick={() => setLocation('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with navigation and save button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2 text-purple-700 hover:text-purple-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-10">
          {/* Section: Basic Info */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Basic Information</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">What should we call you?</label>
              <Input
                type="text"
                value={(formData as any).name || ''}
                onChange={e => setFormData({ ...(formData as any), name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">How young are you?</label>
              <div className="flex flex-wrap gap-3">
                {['Below 18', '18–25', '26–35', '36–45', '46–55', '55+', "I'm not sure"].map(age => (
                  <label
                    key={age}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${(formData as any).age === age ? 'bg-purple-100 border-purple-500 text-purple-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-purple-400`}
                  >
                    <input
                      type="radio"
                      checked={(formData as any).age === age}
                      onChange={() => setFormData({ ...(formData as any), age })}
                      className="hidden"
                    />
                    {age}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Goals */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Your Wellness Goals</h2>
            <div className="flex flex-wrap gap-3">
              {[
                'Balance my hormones',
                'Boost my energy',
                'Sleep better',
                'Manage stress',
                'Maintain healthy weight',
                'Reduce PMS symptoms'
              ].map(goal => (
                <label
                  key={goal}
                  className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                    ${((formData as any).goals || []).includes(goal) ? 'bg-pink-100 border-pink-500 text-pink-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                    hover:border-pink-400`}
                >
                  <input
                    type="checkbox"
                    checked={((formData as any).goals || []).includes(goal)}
                    onChange={() => {
                      const current = (formData as any).goals || [];
                      setFormData({
                        ...(formData as any),
                        goals: current.includes(goal)
                          ? current.filter((g: string) => g !== goal)
                          : [...current, goal]
                      });
                    }}
                    className="hidden"
                  />
                  {goal}
                </label>
              ))}
            </div>
          </div>

          {/* Section: Period Description */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Your Periods</h2>
            <label className="block text-sm font-medium mb-2">How would you describe your periods?</label>
            <div className="flex flex-col gap-3">
              {['Regular', 'Irregular', 'Occasional Skips', "I don't have periods", "I'm not sure"].map(option => (
                <label
                  key={option}
                  className={`flex items-center px-4 py-3 rounded-lg border cursor-pointer transition-all
                    ${((formData as any).periodDescription === option) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                    hover:border-orange-400`}
                >
                  <input
                    type="radio"
                    name="periodDescription"
                    value={option}
                    checked={(formData as any).periodDescription === option}
                    onChange={() =>
                      setFormData({
                        ...(formData as any),
                        periodDescription: option
                      })
                    }
                    className="hidden"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Section: Birth Control */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Birth Control</h2>
            <div className="flex flex-wrap gap-3">
              {['Hormonal Birth Control Pills', 'IUD (Intrauterine Device)'].map(option => (
                <label
                  key={option}
                  className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                    ${((formData as any).birthControl || []).includes(option) ? 'bg-pink-100 border-pink-500 text-pink-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                    hover:border-pink-400`}
                >
                  <input
                    type="checkbox"
                    checked={((formData as any).birthControl || []).includes(option)}
                    onChange={() => {
                      const current = (formData as any).birthControl || [];
                      setFormData({
                        ...(formData as any),
                        birthControl: current.includes(option)
                          ? current.filter((o: string) => o !== option)
                          : [...current, option]
                      });
                    }}
                    className="hidden"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Section: Last Period Date & Cycle Length */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Period Details</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">When did your last period start?</label>
              <Input
                type="date"
                value={(formData as any).lastPeriodDate || ''}
                onChange={e => setFormData({
                  ...(formData as any),
                  lastPeriodDate: e.target.value
                })}
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">What is your average cycle length?</label>
              <div className="flex flex-wrap gap-3">
                {['Less than 21 days', '21–25 days', '26–30 days', '31–35 days', '35+ days', "I'm not sure"].map(length => (
                  <label
                    key={length}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${((formData as any).cycleLength === length) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-orange-400`}
                  >
                    <input
                      type="radio"
                      name="cycleLength"
                      value={length}
                      checked={(formData as any).cycleLength === length}
                      onChange={() => setFormData({
                        ...(formData as any),
                        cycleLength: length
                      })}
                      className="hidden"
                    />
                    {length}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Symptoms/Concerns */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Concerns</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Period concerns</label>
              <div className="flex flex-wrap gap-3">
                {['Irregular periods', 'Painful periods', 'Light periods / Spotting', 'Heavy periods'].map(concern => (
                  <label
                    key={concern}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${((formData as any).symptoms || []).includes(concern) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-orange-400`}
                  >
                    <input
                      type="checkbox"
                      checked={((formData as any).symptoms || []).includes(concern)}
                      onChange={() => handleArrayToggle('symptoms', concern)}
                      className="hidden"
                    />
                    {concern}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Body concerns</label>
              <div className="flex flex-wrap gap-3">
                {['Bloating', 'Hot Flashes', 'Nausea', 'Difficulty losing weight / stubborn belly fat', 'Recent weight gain', 'Menstrual headaches'].map(concern => (
                  <label
                    key={concern}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${((formData as any).symptoms || []).includes(concern) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-orange-400`}
                  >
                    <input
                      type="checkbox"
                      checked={((formData as any).symptoms || []).includes(concern)}
                      onChange={() => handleArrayToggle('symptoms', concern)}
                      className="hidden"
                    />
                    {concern}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Skin and hair concerns</label>
              <div className="flex flex-wrap gap-3">
                {['Hirsutism (hair growth on chin, nipples etc)', 'Thinning of hair', 'Adult Acne'].map(concern => (
                  <label
                    key={concern}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${((formData as any).symptoms || []).includes(concern) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-orange-400`}
                  >
                    <input
                      type="checkbox"
                      checked={((formData as any).symptoms || []).includes(concern)}
                      onChange={() => handleArrayToggle('symptoms', concern)}
                      className="hidden"
                    />
                    {concern}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Mental health concerns</label>
              <div className="flex flex-wrap gap-3">
                {['Mood swings', 'Fatigue', 'Stress'].map(concern => (
                  <label
                    key={concern}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${((formData as any).symptoms || []).includes(concern) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-orange-400`}
                  >
                    <input
                      type="checkbox"
                      checked={((formData as any).symptoms || []).includes(concern)}
                      onChange={() => handleArrayToggle('symptoms', concern)}
                      className="hidden"
                    />
                    {concern}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Other concerns</label>
              <div className="flex flex-wrap gap-3">
                {['None of these', 'Others (please specify)'].map(concern => (
                  <label
                    key={concern}
                    className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                      ${((formData as any).symptoms || []).includes(concern) ? 'bg-orange-100 border-orange-500 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                      hover:border-orange-400`}
                  >
                    <input
                      type="checkbox"
                      checked={((formData as any).symptoms || []).includes(concern)}
                      onChange={() => handleArrayToggle('symptoms', concern)}
                      className="hidden"
                    />
                    {concern}
                  </label>
                ))}
              </div>
              {((formData as any).symptoms || []).includes('Others (please specify)') && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-2">Please specify</label>
                  <Input
                    type="text"
                    value={(formData as any).otherConcern || ''}
                    onChange={e => setFormData({ ...(formData as any), otherConcern: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section: Diagnosed Health Conditions */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Diagnosed Health Conditions</h2>
            <div className="flex flex-wrap gap-3">
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
              ].map(condition => (
                <label
                  key={condition}
                  className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all
                    ${((formData as any).medicalConditions || []).includes(condition) ? 'bg-green-100 border-green-500 text-green-700 font-semibold' : 'bg-gray-50 border-gray-300'}
                    hover:border-green-400`}
                >
                  <input
                    type="checkbox"
                    checked={((formData as any).medicalConditions || []).includes(condition)}
                    onChange={() => handleArrayToggle('medicalConditions', condition)}
                    className="hidden"
                  />
                  {condition}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

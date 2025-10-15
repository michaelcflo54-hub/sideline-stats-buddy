import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface PracticePeriod {
  id: string;
  period: number;
  time: string;
  activity: string;
  olh?: string;
  qbf?: string;
  xsz?: string;
  lb?: string;
  db?: string;
  dedl?: string;
}

const PracticePlan = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [opponent, setOpponent] = useState('');
  const [practiceNumber, setPracticeNumber] = useState('');
  const [prePractice, setPrePractice] = useState('');
  const [dress, setDress] = useState('');
  const [goals, setGoals] = useState('');
  const [periods, setPeriods] = useState<PracticePeriod[]>([
    { id: '1', period: 1, time: '5:30', activity: '' },
    { id: '2', period: 2, time: '5:35', activity: 'Warm Up' },
    { id: '3', period: 3, time: '5:40', activity: 'Hammer/Nail (About 2 Mins)' },
  ]);
  const [moreNotes, setMoreNotes] = useState('');

  const canManageTeam = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const newPeriod: PracticePeriod = {
      id: Date.now().toString(),
      period: lastPeriod.period + 1,
      time: '',
      activity: '',
    };
    setPeriods([...periods, newPeriod]);
  };

  const removePeriod = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
  };

  const updatePeriod = (id: string, field: keyof PracticePeriod, value: string) => {
    setPeriods(periods.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  if (!canManageTeam) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Only coaches can manage practice plans.
              </p>
              <Button onClick={() => navigate('/team')} className="mt-4">
                Back to Team
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/team')}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Practice Plan</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Select Practice Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Practice Info */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input 
                  value={format(selectedDate, 'MM/dd/yyyy')} 
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="opponent">Opponent</Label>
                <Input
                  id="opponent"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="e.g., Homewood"
                />
              </div>
              <div>
                <Label htmlFor="practice-number">Practice #</Label>
                <Input
                  id="practice-number"
                  type="number"
                  value={practiceNumber}
                  onChange={(e) => setPracticeNumber(e.target.value)}
                  placeholder="e.g., 35"
                />
              </div>
              <div>
                <Label htmlFor="pre-practice">Pre Practice</Label>
                <Input
                  id="pre-practice"
                  value={prePractice}
                  onChange={(e) => setPrePractice(e.target.value)}
                  placeholder="e.g., QB/C Snaps = 20"
                />
              </div>
              <div>
                <Label htmlFor="dress">Dress</Label>
                <Input
                  id="dress"
                  value={dress}
                  onChange={(e) => setDress(e.target.value)}
                  placeholder="e.g., Full Pads"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Section */}
        <Card>
          <CardHeader>
            <CardTitle>Goals / Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Enter practice goals and notes..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Practice Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Practice Schedule</CardTitle>
              <Button onClick={addPeriod} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Period
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 font-semibold text-sm border-b pb-2">
                <div className="col-span-1">PER</div>
                <div className="col-span-2">TIME</div>
                <div className="col-span-3">Activity</div>
                <div className="col-span-2">OL/H</div>
                <div className="col-span-2">QB/F</div>
                <div className="col-span-2">X/S/Z</div>
              </div>

              {/* Period Rows */}
              {periods.map((period) => (
                <div key={period.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={period.period}
                      onChange={(e) => updatePeriod(period.id, 'period', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="time"
                      value={period.time}
                      onChange={(e) => updatePeriod(period.id, 'time', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={period.activity}
                      onChange={(e) => updatePeriod(period.id, 'activity', e.target.value)}
                      placeholder="Activity"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={period.olh || ''}
                      onChange={(e) => updatePeriod(period.id, 'olh', e.target.value)}
                      placeholder="OL/H"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={period.qbf || ''}
                      onChange={(e) => updatePeriod(period.id, 'qbf', e.target.value)}
                      placeholder="QB/F"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      value={period.xsz || ''}
                      onChange={(e) => updatePeriod(period.id, 'xsz', e.target.value)}
                      placeholder="X/S/Z"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePeriod(period.id)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* More Notes Section */}
        <Card>
          <CardHeader>
            <CardTitle>More Notes / Focus</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={moreNotes}
              onChange={(e) => setMoreNotes(e.target.value)}
              placeholder="Additional notes, focus areas, or special instructions..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button className="flex-1">Save Practice Plan</Button>
          <Button variant="outline" className="flex-1">Print Plan</Button>
        </div>
      </div>
    </Layout>
  );
};

export default PracticePlan;

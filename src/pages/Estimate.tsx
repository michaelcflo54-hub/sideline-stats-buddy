import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Estimate = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: (form.get('name') as string)?.trim(),
      phone: (form.get('phone') as string)?.trim(),
      email: (form.get('email') as string)?.trim(),
      address: (form.get('address') as string)?.trim(),
      description: (form.get('description') as string)?.trim(),
    };

    const { error } = await supabase.from('estimates').insert(payload);
    setLoading(false);

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      return;
    }

    (e.currentTarget as HTMLFormElement).reset();
    toast({ title: 'Request received', description: 'We will contact you shortly.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Get an Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Your name" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="(555) 555-5555" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" name="email" placeholder="you@email.com" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="Project address" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description of work</Label>
                <Textarea id="description" name="description" placeholder="Tell us about your project" rows={6} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Estimate;

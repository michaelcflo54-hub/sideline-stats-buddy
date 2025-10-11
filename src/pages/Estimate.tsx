import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const Estimate = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const phone = form.get('phone') as string;
    const email = form.get('email') as string;
    const address = form.get('address') as string;
    const description = form.get('description') as string;

    const { error } = await supabase.from('estimates').insert({
      name,
      phone,
      email,
      address,
      description,
    });

    if (!error) {
      setSubmitted(true);
      (e.currentTarget as HTMLFormElement).reset();
    } else {
      alert(error.message);
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Get an Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="p-4 bg-green-50 rounded">Thanks! We'll be in touch shortly.</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" inputMode="tel" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description of Work</Label>
                <Textarea id="description" name="description" required rows={5} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Submitting...' : 'Submit'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Estimate;

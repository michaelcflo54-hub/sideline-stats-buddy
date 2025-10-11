import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const isOwner = (user as any)?.user_metadata?.role === 'owner';

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get('photo') as File | null;
    if (!file) return;

    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('gallery').upload(filePath, file, { upsert: false });
    setUploading(false);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Uploaded', description: 'Photo added to gallery.' });
      (e.currentTarget as HTMLFormElement).reset();
    }
  };

  const handlePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPosting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      customer_id: (form.get('customer_id') as string)?.trim(),
      title: (form.get('title') as string)?.trim(),
      message: (form.get('message') as string)?.trim(),
      posted_by: user?.id ?? null,
    };
    const { error } = await supabase.from('customer_updates').insert(payload);
    setPosting(false);
    if (error) {
      toast({ title: 'Failed to post update', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Update posted', description: 'The customer can now view it.' });
      (e.currentTarget as HTMLFormElement).reset();
    }
  };

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Owner access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Photo to Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="photo">Photo</Label>
                <Input id="photo" name="photo" type="file" accept="image/*" required />
              </div>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post Customer Update</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePost} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="customer_id">Customer ID</Label>
                <Input id="customer_id" name="customer_id" placeholder="UUID for customer account" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Framing complete" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" placeholder="Short update details" rows={5} />
              </div>
              <Button type="submit" disabled={posting}>
                {posting ? 'Posting…' : 'Post Update'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const OwnerDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [updateFile, setUpdateFile] = useState<File | null>(null);

  useEffect(() => {}, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== 'owner') {
    return <div className="p-4">You must be the owner to access this page.</div>;
  }

  const uploadToBucket = async (bucket: string, file: File) => {
    const filename = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return filename;
  };

  const handleUploadGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryFile) return;
    try {
      await uploadToBucket('gallery', galleryFile);
      alert('Uploaded to gallery');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCustomerUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const customer_email = form.get('customer_email') as string;
    const title = form.get('title') as string;
    const message = form.get('message') as string;

    let image_path: string | undefined = undefined;
    if (updateFile) {
      image_path = await uploadToBucket('customer-updates', updateFile);
    }

    const { error } = await supabase.from('customer_updates').insert({
      customer_email,
      title,
      message,
      image_path,
      created_by: profile?.user_id,
    });

    if (error) alert(error.message);
    else alert('Customer update posted');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Gallery Image</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUploadGallery} className="space-y-4">
              <Input type="file" accept="image/*" onChange={(e) => setGalleryFile(e.target.files?.[0] || null)} />
              <Button type="submit">Upload</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post Customer Update</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCustomerUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input id="customer_email" name="customer_email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setUpdateFile(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit">Post Update</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;

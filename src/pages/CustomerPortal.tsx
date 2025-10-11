import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UpdateItem {
  id: string;
  created_at: string;
  title: string;
  message: string | null;
  image_path: string | null;
}

const CustomerPortal = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_updates')
        .select('id, created_at, title, message, image_path')
        .order('created_at', { ascending: false });
      // RLS should filter to only current user if policy uses customer_id=auth.uid()
      if (!error) setUpdates((data as any) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Project Updates</h1>
        {loading && <p>Loading…</p>}
        {!loading && updates.length === 0 && <p className="text-muted-foreground">No updates yet.</p>}
        <div className="grid gap-4">
          {updates.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>{u.title}</span>
                  <span className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {u.image_path && (
                  <img
                    src={supabase.storage.from('gallery').getPublicUrl(u.image_path).data.publicUrl}
                    alt={u.title}
                    className="w-full max-h-96 object-cover rounded"
                  />
                )}
                {u.message && <p className="text-muted-foreground">{u.message}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GalleryItem {
  name: string;
  publicUrl: string;
}

const Gallery = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage.from('gallery').list('', { limit: 100, offset: 0 });
      if (error) {
        setItems([]);
        setLoading(false);
        return;
      }
      const mapped: GalleryItem[] = (data ?? [])
        .filter((f) => !f.name.startsWith('.') && !f.name.endsWith('/'))
        .map((f) => ({
          name: f.name,
          publicUrl: supabase.storage.from('gallery').getPublicUrl(f.name).data.publicUrl,
        }));
      setItems(mapped);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Project Gallery</h1>
        {loading && <p>Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="text-muted-foreground">No photos yet. Check back soon.</div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <Card key={it.name} className="overflow-hidden group">
              <CardContent className="p-0">
                <img src={it.publicUrl} alt={it.name} className="w-full h-40 object-cover" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;

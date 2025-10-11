import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface ImageItem {
  name: string;
  publicUrl: string;
}

const Gallery = () => {
  const [images, setImages] = useState<ImageItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.storage.from('gallery').list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
      if (error) return;
      const items = (data || [])
        .filter((f) => !f.name.startsWith('.') && !f.name.endsWith('/'))
        .map((f) => ({
          name: f.name,
          publicUrl: supabase.storage.from('gallery').getPublicUrl(f.name).data.publicUrl,
        }));
      setImages(items);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle>Project Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <img key={img.name} src={img.publicUrl} alt={img.name} className="w-full h-40 object-cover rounded" />
            ))}
            {images.length === 0 && (
              <div className="text-muted-foreground">No images yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Gallery;

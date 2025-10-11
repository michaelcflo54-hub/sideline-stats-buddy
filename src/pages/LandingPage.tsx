import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image, Shield, Smartphone, Hammer, FolderOpen } from 'lucide-react';
import logoImage from '@/assets/down-and-distance-logo.png';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Hawksnest Construction" className="w-8 h-8 rounded" />
            <span className="text-xl font-bold">HAWKSNEST Construction</span>
          </div>
          <div className="flex gap-2">
            <Link to="/gallery">
              <Button variant="ghost" className="hidden sm:inline-flex">Gallery</Button>
            </Link>
            <Link to="/estimate">
              <Button variant="outline">Get an Estimate</Button>
            </Link>
            <Link to="/auth">
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
            Quality craftsmanship for your home and business
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Owner-operated construction and remodeling. Mobile-friendly scheduling and progress updates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/estimate">
              <Button size="lg" className="text-lg px-8 py-6">Get an Estimate</Button>
            </Link>
            <Link to="/gallery">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">View Gallery</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Hammer className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Owner Operated</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Direct communication and accountability from start to finish.</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Image className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Project Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">See photos of recent builds, remodels, and repairs.</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Customer Portal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Log in anytime to view progress updates and photos.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start your project?</h2>
          <p className="text-lg opacity-90 mb-8">Tell us about your vision and get a fast, friendly estimate.</p>
          <Link to="/estimate">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">Get an Estimate</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logoImage} alt="Hawksnest Construction" className="w-6 h-6 rounded" />
            <span className="font-bold">HAWKSNEST Construction</span>
          </div>
          <p className="text-muted-foreground">Licensed • Insured • Quality Guaranteed</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
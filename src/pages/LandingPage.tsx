import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, Image as ImageIcon, Smartphone } from 'lucide-react';
import logoImage from '@/assets/down-and-distance-logo.png';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Hawksnest Construction" className="w-8 h-8" />
            <span className="text-xl font-bold">Hawksnest Construction</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
            Owner‑Operated <span className="text-primary">Construction</span> done right
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Quality craftsmanship, clear communication, and fair pricing.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/estimate">
              <Button size="lg" className="text-lg px-8 py-6">
                Get an Estimate
              </Button>
            </Link>
            <Link to="/gallery">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View Gallery
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why homeowners choose Hawksnest
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Small company attention with big company standards.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Hammer className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Quality Craftsmanship</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Experienced, detail‑oriented work on every project.</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Transparent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">See our work in the gallery and your customer page.</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Mobile Friendly</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Request estimates and check updates from your phone.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6 text-destructive">
                  The Excel Headache
                </h3>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span>Fumbling with spreadsheets during live games</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span>Manual calculations that eat up precious time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span>Guessing on critical 3rd down situations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span>No insights into what's actually working</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-6 text-primary">
                  The Down & Distance Solution
                </h3>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span>Log plays instantly with simple dropdowns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span>Automatic calculations and real-time stats</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span>AI recommendations for every situation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span>Clear insights to improve your game plan</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start your project?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">Tell us about your job and we'll reach out.</p>
          <Link to="/estimate">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">Get an Estimate</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={logoImage} alt="Hawksnest Construction" className="w-6 h-6" />
            <span className="font-bold">Hawksnest Construction</span>
          </div>
          <p className="text-muted-foreground">
            Residential remodeling, decks, siding, and more.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, Target, Smartphone } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Down & Distance</span>
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
            Finally, a stats app built for{' '}
            <span className="text-primary">youth football coaches</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Turn game-day chaos into data-driven decisions
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Log plays with simple dropdowns, get AI insights instantly, and never second-guess your 3rd down calls again.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Logging Plays
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                See How It Works
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
              Stop Fighting With Excel Spreadsheets
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built specifically for youth coaches—not complex pro-level systems
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Simple Play Logging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Drop Excel. Use dropdowns. Log plays in seconds during live games with our intuitive interface.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">AI-Powered Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get instant recommendations for any down and distance situation (like 3rd and 6).
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Sideline Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Mobile-responsive design built for coaches who need to make quick decisions on the sidelines.
                </p>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Ditch the Spreadsheets?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join youth football coaches who've already made the switch to data-driven decisions
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Down & Distance</span>
          </div>
          <p className="text-muted-foreground">
            Youth Football Analytics Platform
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
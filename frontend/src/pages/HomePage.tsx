import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Upload, Search, Briefcase, Users, Shield, Zap } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user, hasRole } = useAuth();

  const features = [
    {
      icon: Upload,
      title: 'Smart Upload',
      description: 'Upload PDF, DOCX, or ZIP files with automatic text extraction and PII detection.',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Search,
      title: 'Semantic Search',
      description: 'Find candidates using natural language queries powered by mock embeddings.',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Briefcase,
      title: 'Job Matching',
      description: 'Automatically match resumes to job requirements with detailed scoring.',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Shield,
      title: 'PII Protection',
      description: 'Automatic PII redaction for non-recruiters with role-based access control.',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: Zap,
      title: 'Fast Processing',
      description: 'Lightning-fast resume processing with mock embeddings and cosine similarity.',
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      icon: Users,
      title: 'Role Management',
      description: 'Different access levels for users, recruiters, and administrators.',
      color: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to{' '}
            <span className="text-primary-600 dark:text-primary-400">ResumeRAG</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            AI-powered resume search and job matching system. Upload resumes, search with natural language,
            and automatically match candidates to job requirements.
          </p>
          
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/upload">
                <Button variant="primary" size="lg" className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload Resumes</span>
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="outline" size="lg" className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Search Resumes</span>
                </Button>
              </Link>
              {hasRole('RECRUITER') && (
                <Link to="/jobs">
                  <Button variant="outline" size="lg" className="flex items-center space-x-2">
                    <Briefcase className="w-5 h-5" />
                    <span>Manage Jobs</span>
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* User Info */}
        {isAuthenticated && (
          <Card className="mb-12">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome back, {user?.name}!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    You're logged in as a {user?.role.toLowerCase()}
                  </p>
                </div>
                <Badge variant={user?.role === 'ADMIN' ? 'error' : user?.role === 'RECRUITER' ? 'warning' : 'default'}>
                  {user?.role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 mr-4`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="text-center">Built With Modern Technology</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
              {[
                'Node.js', 'Express', 'TypeScript', 'React', 'Vite', 'TailwindCSS',
                'PostgreSQL', 'Prisma', 'JWT', 'Docker', 'Jest', 'Multer'
              ].map((tech) => (
                <Badge key={tech} variant="default" className="justify-center">
                  {tech}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">API Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  RESTful API
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Clean, documented API endpoints with proper error handling
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Authentication
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  JWT-based authentication with role-based access control
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Rate Limiting
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  60 requests per minute per user with idempotency support
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

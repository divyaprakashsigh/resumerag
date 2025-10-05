import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobAPI } from '../utils/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Briefcase, Plus, Calendar, Users, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { Job, MatchResult } from '../types';

export const JobsPage: React.FC = () => {
  const { isAuthenticated, hasRole } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  // Create job form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    requirements: [''] // Start with one empty requirement
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadJobs();
    }
  }, [isAuthenticated]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await jobAPI.getAll({ limit: 20 });
      setJobs(response.items);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to load jobs';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasRole('RECRUITER')) {
      toast.error('Only recruiters can create job postings');
      return;
    }

    const validRequirements = createForm.requirements.filter(req => req.trim());
    if (validRequirements.length === 0) {
      toast.error('At least one requirement is needed');
      return;
    }

    setIsLoading(true);
    try {
      const newJob = await jobAPI.create({
        title: createForm.title,
        description: createForm.description,
        requirements: validRequirements
      });

      setJobs(prev => [newJob, ...prev]);
      setShowCreateForm(false);
      setCreateForm({ title: '', description: '', requirements: [''] });
      toast.success('Job posting created successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create job';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchCandidates = async (job: Job) => {
    if (!hasRole('RECRUITER')) {
      toast.error('Only recruiters can match candidates');
      return;
    }

    setIsMatching(true);
    setSelectedJob(job);
    try {
      const response = await jobAPI.match(job.id, 10);
      setMatchResults(response.candidates);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to match candidates';
      toast.error(message);
    } finally {
      setIsMatching(false);
    }
  };

  const addRequirement = () => {
    setCreateForm(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const removeRequirement = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please login to view jobs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be authenticated to access job postings.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Job Postings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse and create job postings, match candidates
            </p>
          </div>
          {hasRole('RECRUITER') && (
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job</span>
            </Button>
          )}
        </div>

        {/* Create Job Form */}
        {showCreateForm && hasRole('RECRUITER') && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Job Posting</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateJob} className="space-y-6">
                <Input
                  label="Job Title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the role, responsibilities, and company culture..."
                    className="input min-h-[120px] resize-y"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Requirements
                  </label>
                  <div className="space-y-2">
                    {createForm.requirements.map((req, index) => (
                      <div key={index} className="flex space-x-2">
                        <Input
                          value={req}
                          onChange={(e) => updateRequirement(index, e.target.value)}
                          placeholder="e.g., 5+ years React experience"
                          className="flex-1"
                        />
                        {createForm.requirements.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeRequirement(index)}
                            className="px-3"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRequirement}
                    className="mt-2"
                  >
                    Add Requirement
                  </Button>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                  >
                    Create Job
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Jobs List */}
        {isLoading && jobs.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-6">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-3">
                      <Briefcase className="w-8 h-8 text-primary-600 mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {job.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Posted {formatDate(job.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="w-4 h-4" />
                            <span>{job.requirements.length} requirements</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {hasRole('RECRUITER') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMatchCandidates(job)}
                        loading={isMatching && selectedJob?.id === job.id}
                        className="flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4" />
                        <span>Match Candidates</span>
                      </Button>
                    )}
                  </div>

                  <div className="prose max-w-none dark:prose-invert mb-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      {job.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Requirements:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {job.requirements.map((req) => (
                        <Badge key={req} variant="default">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No job postings found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {hasRole('RECRUITER') 
                    ? 'Create your first job posting to get started.'
                    : 'No job postings are available at the moment.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match Results Modal */}
        {selectedJob && matchResults.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Candidates for {selectedJob.title}
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedJob(null);
                      setMatchResults([]);
                    }}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-4">
                  {matchResults.map((result, index) => (
                    <Card key={result.resume_id}>
                      <CardContent>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {result.candidate_name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {result.candidate_email} • {result.resume_filename}
                            </p>
                          </div>
                          <Badge variant={result.match_score > 80 ? 'success' : result.match_score > 60 ? 'warning' : 'error'}>
                            {result.match_score.toFixed(1)}% Match
                          </Badge>
                        </div>

                        {result.evidence_snippets.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Evidence:
                            </h4>
                            <div className="space-y-2">
                              {result.evidence_snippets.map((snippet, idx) => (
                                <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <p className="text-sm text-green-800 dark:text-green-200">
                                    {snippet}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.missing_requirements.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Missing Requirements:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {result.missing_requirements.map((req, idx) => (
                                <Badge key={idx} variant="error">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resumeAPI } from '../utils/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Search, FileText, Calendar, User, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Resume } from '../types';

export const SearchPage: React.FC = () => {
  const { isAuthenticated, canViewPII } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const searchResumes = async (query: string, resetOffset = true) => {
    if (!isAuthenticated) {
      toast.error('Please login to search resumes');
      return;
    }

    setIsLoading(true);
    try {
      const currentOffset = resetOffset ? 0 : offset;
      const response = await resumeAPI.search({
        q: query,
        limit: 10,
        offset: currentOffset
      });

      if (resetOffset) {
        setResumes(response.items);
        setOffset(10);
      } else {
        setResumes(prev => [...prev, ...response.items]);
        setOffset(prev => prev + 10);
      }

      setHasMore(!!response.next_offset);
      setHasSearched(true);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Search failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchResumes(searchQuery.trim(), true);
    }
  };

  const loadMore = () => {
    if (searchQuery.trim() && hasMore && !isLoading) {
      searchResumes(searchQuery.trim(), false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please login to search resumes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be authenticated to access the search functionality.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Search Resumes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search through uploaded resumes using keywords
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search for skills, experience, education..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                className="flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {hasSearched && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Search Results
              {resumes.length > 0 && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({resumes.length} resume{resumes.length !== 1 ? 's' : ''} found)
                </span>
              )}
            </h2>
          </div>
        )}

        {/* Results List */}
        {isLoading && resumes.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : resumes.length > 0 ? (
          <div className="space-y-6">
            {resumes.map((resume) => (
              <Card key={resume.id}>
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-primary-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {resume.filename}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(resume.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {canViewPII() && resume.pii && (
                      <div className="flex space-x-2">
                        {resume.pii.emails && resume.pii.emails.length > 0 && (
                          <Badge variant="info" className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{resume.pii.emails.length}</span>
                          </Badge>
                        )}
                        {resume.pii.phones && resume.pii.phones.length > 0 && (
                          <Badge variant="info" className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{resume.pii.phones.length}</span>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="prose max-w-none dark:prose-invert">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {truncateText(resume.text)}
                    </p>
                  </div>

                  {canViewPII() && resume.pii && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Extracted Information:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {resume.pii.emails && resume.pii.emails.length > 0 && (
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-200">Emails:</span>
                            <ul className="mt-1 space-y-1">
                              {resume.pii.emails.map((email, index) => (
                                <li key={index} className="text-blue-700 dark:text-blue-300">{email}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {resume.pii.phones && resume.pii.phones.length > 0 && (
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-200">Phones:</span>
                            <ul className="mt-1 space-y-1">
                              {resume.pii.phones.map((phone, index) => (
                                <li key={index} className="text-blue-700 dark:text-blue-300">{phone}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {resume.pii.names && resume.pii.names.length > 0 && (
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-200">Names:</span>
                            <ul className="mt-1 space-y-1">
                              {resume.pii.names.map((name, index) => (
                                <li key={index} className="text-blue-700 dark:text-blue-300">{name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        ) : hasSearched ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No resumes found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search terms or upload some resumes first.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
};

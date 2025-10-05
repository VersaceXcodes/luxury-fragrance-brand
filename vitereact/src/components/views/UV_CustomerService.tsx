import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// TypeScript interfaces
interface FAQ {
  faq_id: string;
  question: string;
  answer: string;
  category: string;
  helpful_votes: number;
}

interface SupportTicketForm {
  customer_email: string;
  customer_name: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  order_id: string;
}

interface ChatMessage {
  id: string;
  message_id: string;
  session_id: string;
  sender_type: 'user' | 'agent';
  sender_name?: string;
  message: string;
  timestamp: string;
  type?: string;
}

interface ChatSession {
  session_id: string;
  status: 'waiting' | 'active' | 'ended';
  agent_name?: string;
}



// Support categories
const SUPPORT_CATEGORIES = [
  { value: 'orders', label: 'Orders & Shipping', icon: '📦' },
  { value: 'returns', label: 'Returns & Exchanges', icon: '↩️' },
  { value: 'products', label: 'Product Information', icon: '🌸' },
  { value: 'account', label: 'Account Management', icon: '👤' },
  { value: 'payment', label: 'Payment & Billing', icon: '💳' },
  { value: 'general', label: 'General Inquiry', icon: '💬' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const UV_CustomerService: React.FC = () => {
  // URL params handling
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get('topic');
  const orderIdParam = searchParams.get('order_id');

  // Zustand state access (individual selectors)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state variables
  const [selectedTopic, setSelectedTopic] = useState<string | null>(topicParam || null);
  const [contextOrderId, setContextOrderId] = useState<string | null>(orderIdParam || null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'chat'>('faq');
  
  const [supportTicketForm, setSupportTicketForm] = useState<SupportTicketForm>({
    customer_email: currentUser?.email || '',
    customer_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '',
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
    order_id: contextOrderId || '',
  });

  // Chat state
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [agentTyping, setAgentTyping] = useState<boolean>(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  // Update form when user changes or URL params change
  useEffect(() => {
    if (currentUser) {
      setSupportTicketForm(prev => ({
        ...prev,
        customer_email: currentUser.email,
        customer_name: `${currentUser.first_name} ${currentUser.last_name}`,
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (contextOrderId !== orderIdParam) {
      setContextOrderId(orderIdParam);
      setSupportTicketForm(prev => ({
        ...prev,
        order_id: orderIdParam || '',
      }));
    }
  }, [orderIdParam, contextOrderId]);

  // API functions
  const fetchFAQs = async () => {
    const params = new URLSearchParams();
    if (selectedTopic) params.append('category', selectedTopic);
    if (searchQuery) params.append('query', searchQuery);

    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/support/faq?${params}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  };

  const createSupportTicket = async (ticketData: SupportTicketForm) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/support/tickets`,
      {
        customer_email: ticketData.customer_email,
        customer_name: ticketData.customer_name,
        subject: ticketData.subject,
        message: ticketData.message,
        category: ticketData.category,
        priority: ticketData.priority,
        order_id: ticketData.order_id || undefined,
      },
      { headers }
    );
    return response.data;
  };

  // React Query hooks
  const {
    data: faqItems = [],
    isLoading: faqsLoading,
    error: faqsError,
  } = useQuery({
    queryKey: ['faqs', selectedTopic, searchQuery],
    queryFn: fetchFAQs,
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  const ticketMutation = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: (data) => {
      showNotification({
        type: 'success',
        title: 'Support Ticket Created',
        message: `Your ticket #${data.ticket_number} has been created. We'll respond within 24 hours.`,
        auto_dismiss: true,
        duration: 5000,
      });
      
      // Reset form
      setSupportTicketForm({
        customer_email: currentUser?.email || '',
        customer_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '',
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium',
        order_id: contextOrderId || '',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create support ticket';
      showNotification({
        type: 'error',
        title: 'Ticket Creation Failed',
        message: errorMessage,
        auto_dismiss: true,
        duration: 5000,
      });
    },
  });

  // Event handlers
  const handleTopicChange = (category: string | null) => {
    setSelectedTopic(category);
    setSearchQuery(''); // Clear search when changing category
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!supportTicketForm.customer_email || !supportTicketForm.customer_name || 
        !supportTicketForm.subject || !supportTicketForm.message) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.',
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }

    ticketMutation.mutate(supportTicketForm);
  };

  const handleFormChange = (field: keyof SupportTicketForm, value: string) => {
    setSupportTicketForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Chat API functions
  const startChatSession = async (initialMessage?: string) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/chat/start`,
      {
        topic: selectedTopic || 'general',
        message: initialMessage
      },
      { headers }
    );
    return response.data;
  };

  // WebSocket connection
  const connectWebSocket = (sessionId: string) => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    if (authToken) {
      params.append('token', authToken);
    }
    
    const ws = new WebSocket(`${wsUrl}?${params.toString()}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnecting(false);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            setChatSession(prev => prev ? { ...prev, status: 'waiting' } : null);
            break;
            
          case 'agent_connected':
            setChatSession(prev => prev ? { 
              ...prev, 
              status: 'active', 
              agent_name: data.agent_name 
            } : null);
            break;
            
          case 'message':
            const newMessage: ChatMessage = {
              id: data.message_id,
              message_id: data.message_id,
              session_id: data.session_id,
              sender_type: data.sender_type,
              sender_name: data.sender_name,
              message: data.message,
              timestamp: data.timestamp
            };
            setChatMessages(prev => [...prev, newMessage]);
            setAgentTyping(false);
            break;
            
          case 'typing':
            if (data.sender_type === 'agent') {
              setAgentTyping(data.is_typing);
            }
            break;
            
          case 'session_ended':
            setChatSession(prev => prev ? { ...prev, status: 'ended' } : null);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnecting(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
      showNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to chat service. Please try again.',
        auto_dismiss: true,
        duration: 5000,
      });
    };
    
    return ws;
  };

  const initializeChatSession = async () => {
    if (isConnecting || chatSession) return;
    
    setIsConnecting(true);
    
    try {
      const response = await startChatSession();
      const session: ChatSession = {
        session_id: response.session_id,
        status: 'waiting'
      };
      setChatSession(session);
      setChatMessages([]);
      
      // Connect WebSocket
      wsRef.current = connectWebSocket(response.session_id);
      
      showNotification({
        type: 'success',
        title: 'Chat Started',
        message: response.message,
        auto_dismiss: true,
        duration: 3000,
      });
    } catch (error: any) {
      setIsConnecting(false);
      const errorMessage = error.response?.data?.message || 'Failed to start chat session';
      showNotification({
        type: 'error',
        title: 'Chat Error',
        message: errorMessage,
        auto_dismiss: true,
        duration: 5000,
      });
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      message: chatInput.trim()
    }));
    
    setChatInput('');
    setIsTyping(false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Send typing indicator
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: true
      }));
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isTyping) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          is_typing: false
        }));
        setIsTyping(false);
      }
    }, 1000);
  };

  const endChatSession = async () => {
    if (!chatSession) return;
    
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/chat/${chatSession.session_id}/end`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` })
          }
        }
      );
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      setChatSession(null);
      setChatMessages([]);
      
      showNotification({
        type: 'info',
        title: 'Chat Ended',
        message: 'Chat session has been ended successfully.',
        auto_dismiss: true,
        duration: 3000,
      });
    } catch (error) {
      console.error('End chat error:', error);
    }
  };

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Cleanup WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Customer Support</h1>
              <p className="text-xl opacity-90 mb-8">
                We're here to help with your luxury fragrance experience
              </p>
              
              {/* Support Channel Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="text-3xl mb-2">💬</div>
                  <h3 className="font-semibold mb-1">Live Chat</h3>
                  <p className="text-sm opacity-80">Available Mon-Fri 9AM-6PM EST</p>
                  <p className="text-sm opacity-80 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Currently: Online
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="text-3xl mb-2">📞</div>
                  <h3 className="font-semibold mb-1">Phone Support</h3>
                  <p className="text-sm opacity-80">1-800-LUXE-SCENT</p>
                  <p className="text-sm opacity-80">Mon-Fri 9AM-7PM EST</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="text-3xl mb-2">📧</div>
                  <h3 className="font-semibold mb-1">Email Support</h3>
                  <p className="text-sm opacity-80">Response within 24 hours</p>
                  <p className="text-sm opacity-80">support@luxescent.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('faq')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'faq'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📚 Help Center & FAQ
                </button>
                <button
                  onClick={() => setActiveTab('contact')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'contact'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ✉️ Contact Support
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'chat'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  💬 Live Chat
                </button>
              </nav>
            </div>
          </div>

          {/* FAQ Section */}
          {activeTab === 'faq' && (
            <div className="space-y-8">
              {/* FAQ Search */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Search Help Articles</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search for help articles..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={selectedTopic || ''}
                      onChange={(e) => handleTopicChange(e.target.value || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">All Categories</option>
                      {SUPPORT_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTopicChange(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTopic === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Topics
                </button>
                {SUPPORT_CATEGORIES.map(category => (
                  <button
                    key={category.value}
                    onClick={() => handleTopicChange(category.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedTopic === category.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.icon} {category.label}
                  </button>
                ))}
              </div>

              {/* FAQ Results */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {searchQuery ? `Search Results for "${searchQuery}"` : 'Frequently Asked Questions'}
                  </h3>
                  
                  {faqsLoading && (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  )}

                  {faqsError && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Failed to load help articles. Please try again.</p>
                    </div>
                  )}

                  {!faqsLoading && !faqsError && faqItems.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {searchQuery ? 'No articles found matching your search.' : 'No articles available.'}
                      </p>
                    </div>
                  )}

                  {!faqsLoading && !faqsError && faqItems.length > 0 && (
                    <div className="space-y-4">
                      {faqItems.map((faq: FAQ) => (
                        <div key={faq.faq_id} className="border border-gray-200 rounded-lg">
                          <details className="group">
                            <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                              <h4 className="font-medium text-gray-900 pr-4">{faq.question}</h4>
                              <svg
                                className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <div className="px-4 pb-4">
                              <div className="text-gray-700 border-t pt-4">
                                <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {SUPPORT_CATEGORIES.find(cat => cat.value === faq.category)?.label || faq.category}
                                  </span>
                                  <span>{faq.helpful_votes} people found this helpful</span>
                                </div>
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Form Section */}
          {activeTab === 'contact' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Support</h2>
                
                <form onSubmit={handleTicketSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="customer_name"
                        type="text"
                        required
                        value={supportTicketForm.customer_name}
                        onChange={(e) => handleFormChange('customer_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="customer_email"
                        type="email"
                        required
                        value={supportTicketForm.customer_email}
                        onChange={(e) => handleFormChange('customer_email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        id="category"
                        required
                        value={supportTicketForm.category}
                        onChange={(e) => handleFormChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {SUPPORT_CATEGORIES.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        id="priority"
                        value={supportTicketForm.priority}
                        onChange={(e) => handleFormChange('priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {PRIORITY_OPTIONS.map(priority => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {contextOrderId && (
                    <div>
                      <label htmlFor="order_id" className="block text-sm font-medium text-gray-700 mb-1">
                        Order ID
                      </label>
                      <input
                        id="order_id"
                        type="text"
                        value={supportTicketForm.order_id}
                        onChange={(e) => handleFormChange('order_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="e.g., LS240001234"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      id="subject"
                      type="text"
                      required
                      value={supportTicketForm.subject}
                      onChange={(e) => handleFormChange('subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Brief description of your inquiry"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={6}
                      value={supportTicketForm.message}
                      onChange={(e) => handleFormChange('message', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Please provide detailed information about your inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketMutation.isPending}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {ticketMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Ticket...
                      </span>
                    ) : (
                      'Submit Support Ticket'
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Live Chat Section */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-md">
                {!chatSession ? (
                  // Chat Start Screen
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Live Chat Support</h2>
                    
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">💬</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Live Chat</h3>
                      <p className="text-gray-600 mb-6">
                        Connect with our customer service team for immediate assistance with your fragrance questions.
                      </p>
                      
                      <div className="space-y-4">
                        <button
                          onClick={initializeChatSession}
                          disabled={isConnecting}
                          className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isConnecting ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Connecting...
                            </span>
                          ) : (
                            'Start Live Chat'
                          )}
                        </button>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            onClick={() => setActiveTab('contact')}
                            className="flex-1 bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                          >
                            Use Contact Form
                          </button>
                          <a
                            href="tel:1-800-LUXE-SCENT"
                            className="flex-1 bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                          >
                            Call Us Now
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Active Chat Interface
                  <div className="flex flex-col h-96">
                    {/* Chat Header */}
                    <div className="bg-purple-600 text-white p-4 rounded-t-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">Live Chat Support</h3>
                          <p className="text-sm opacity-90">
                            {chatSession.status === 'waiting' && 'Connecting you to an agent...'}
                            {chatSession.status === 'active' && chatSession.agent_name && `Connected with ${chatSession.agent_name}`}
                            {chatSession.status === 'ended' && 'Chat session ended'}
                          </p>
                        </div>
                        <button
                          onClick={endChatSession}
                          className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                          title="End Chat"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                      <div className="space-y-4">
                        {chatMessages.map((message) => (
                          <div
                            key={message.message_id}
                            className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_type === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}>
                              {message.sender_type === 'agent' && message.sender_name && (
                                <p className="text-xs font-medium text-gray-500 mb-1">{message.sender_name}</p>
                              )}
                              <p className="text-sm">{message.message}</p>
                              <p className={`text-xs mt-1 ${
                                message.sender_type === 'user' ? 'text-purple-100' : 'text-gray-400'
                              }`}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Agent Typing Indicator */}
                        {agentTyping && (
                          <div className="flex justify-start">
                            <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg max-w-xs">
                              <div className="flex items-center space-x-1">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-xs text-gray-500 ml-2">Agent is typing...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    {/* Chat Input */}
                    {chatSession.status !== 'ended' && (
                      <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => handleChatInputChange(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Type your message..."
                            disabled={chatSession.status === 'waiting'}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            onClick={sendChatMessage}
                            disabled={!chatInput.trim() || chatSession.status === 'waiting'}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                        {isTyping && (
                          <p className="text-xs text-gray-500 mt-1">You are typing...</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Self-Service Tools */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Self-Service Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/track-order"
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-3">📦</div>
                <h3 className="font-semibold text-gray-900 mb-2">Track Your Order</h3>
                <p className="text-gray-600 text-sm">Check the status of your fragrance order and delivery.</p>
              </Link>

              <Link
                to="/account"
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-3">👤</div>
                <h3 className="font-semibold text-gray-900 mb-2">Manage Account</h3>
                <p className="text-gray-600 text-sm">Update your profile, addresses, and preferences.</p>
              </Link>

              <Link
                to="/login?action=reset"
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-3">🔑</div>
                <h3 className="font-semibold text-gray-900 mb-2">Password Reset</h3>
                <p className="text-gray-600 text-sm">Reset your password or recover your account.</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CustomerService;
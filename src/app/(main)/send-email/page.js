"use client";
import { getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function SendEmail() {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const ensureSession = async () => {
      const session = await getSession();
      if (!session) {
        router.push('/auth/signin');
      }
    };
    ensureSession();
  }, [router]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check if file is Excel
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        alert('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      previewExcelFile(selectedFile);
    }
  };

  const previewExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Simple preview - just show first 5 rows
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setPreview(jsonData.slice(0, 5)); // Show first 5 rows
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Error reading Excel file. Please make sure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file || !subject || !message) {
      alert('Please fill all fields and upload an Excel file');
      return;
    }

    setLoading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]; // Remove data:application/octet-stream;base64, prefix
        
        const response = await fetch('/api/email/send-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileData: base64Data,
            subject,
            message,
            campaignName: campaignName || `Campaign-${Date.now()}`
          }),
        });

        const result = await response.json();

        if (response.ok) {
          alert(`Success! ${result.sent} emails sent successfully. ${result.failed} failed.`);
          router.push('/dashboard');
        } else {
          alert(`Error: ${result.message}`);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('An error occurred while sending emails.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Send Bulk Email</h1>
            <p className="text-gray-600 mt-1">Upload your Excel file with email list and send bulk emails</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Campaign Name */}
            <div>
              <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">
                Campaign Name (Optional)
              </label>
              <input
                type="text"
                id="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Email Campaign"
              />
            </div>

            {/* Excel File Upload with Instructions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                  Upload Excel File
                </label>
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  {showInstructions ? 'Hide Instructions' : 'Show File Format Instructions'}
                </button>
              </div>

              {showInstructions && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Excel File Format Requirements:</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>Required Column:</strong> Must include email addresses in a column named:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li><code>email</code>, <code>Email</code>, or <code>EMAIL</code></li>
                    </ul>
                    <p><strong>Optional Column:</strong> Can include names in a column named:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li><code>name</code>, <code>Name</code>, or <code>NAME</code></li>
                    </ul>
                    <p><strong>Example Format:</strong></p>
                    <div className="bg-white p-3 rounded border text-xs font-mono">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold mb-1">Basic Format:</p>
                          <table className="w-full border-collapse border">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-1">email</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr><td className="border p-1">user1@example.com</td></tr>
                              <tr><td className="border p-1">user2@example.com</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">With Names:</p>
                          <table className="w-full border-collapse border">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-1">name</th>
                                <th className="border p-1">email</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border p-1">John Doe</td>
                                <td className="border p-1">john@example.com</td>
                              </tr>
                              <tr>
                                <td className="border p-1">Jane Smith</td>
                                <td className="border p-1">jane@example.com</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs mt-2">
                      <strong>Note:</strong> Additional columns are ignored. Only .xlsx and .xls files are supported.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload an Excel file</span>
                      <input
                        id="file"
                        name="file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="sr-only"
                        required
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">XLSX, XLS up to 10MB</p>
                  {file && (
                    <p className="text-sm text-green-600 font-medium">Selected: {file.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* File Preview */}
            {preview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">File Preview (First 5 rows)</h3>
                  <span className="text-xs text-green-600 font-medium">
                    ✓ File format looks good!
                  </span>
                </div>
                <div className="mt-2 overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(preview[0]).map((key) => (
                          <th 
                            key={key} 
                            className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                              key.toLowerCase() === 'email' ? 'text-green-700 bg-green-50' : 
                              key.toLowerCase() === 'name' ? 'text-blue-700 bg-blue-50' : 
                              'text-gray-500'
                            }`}
                          >
                            {key}
                            {key.toLowerCase() === 'email' && (
                              <span className="ml-1 text-xs">✓</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {Object.entries(row).map(([key, value], cellIndex) => (
                            <td 
                              key={cellIndex} 
                              className={`px-3 py-2 whitespace-nowrap text-sm ${
                                key.toLowerCase() === 'email' ? 'text-green-800 font-medium' : 
                                key.toLowerCase() === 'name' ? 'text-blue-800' : 
                                'text-gray-500'
                              }`}
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Total rows detected: {preview.length} (showing first 5)
                  </p>
                  <div className="flex items-center space-x-4 text-xs">
                    {Object.keys(preview[0]).some(key => key.toLowerCase() === 'email') && (
                      <span className="text-green-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Email column found
                      </span>
                    )}
                    {Object.keys(preview[0]).some(key => key.toLowerCase() === 'name') && (
                      <span className="text-blue-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Name column found
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Email Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Email Subject
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email subject"
                required
              />
            </div>

            {/* Email Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Email Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email message here..."
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (preview.length > 0 && !Object.keys(preview[0]).some(key => key.toLowerCase() === 'email'))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending Emails...' : 'Send Bulk Email'}
              </button>
            </div>

            {/* Warning if no email column found */}
            {preview.length > 0 && !Object.keys(preview[0]).some(key => key.toLowerCase() === 'email') && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800 text-sm font-medium">
                    No email column found! Please check the file format instructions.
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
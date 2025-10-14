import { useState, useRef } from 'react';
import {
  Container,
  FormField,
  Textarea,
  Button,
  SpaceBetween,
  Flashbar,
  Alert,
  ButtonDropdown
} from '@cloudscape-design/components';
import axios from 'axios';
import { fileSave } from 'browser-fs-access';

export function MaskingForm() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);

  async function handleMask() {
    if (!text.trim()) {
      setNotifications([{
        type: 'error',
        content: 'Please enter some text to mask',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    setLoading(true);
    setNotifications([]);
    try {
      const response = await axios.post('/api/mask', {
        text: text,
        patterns: []
      });
      setResult(response.data);
      setNotifications([{
        type: 'success',
        content: `Masked ${response.data.items_masked} items in ${response.data.processing_time_ms.toFixed(1)}ms`,
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: err.response?.data?.detail || 'Masking failed',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setNotifications([{
        type: 'error',
        content: 'File too large (max 50MB)',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setNotifications([{
        type: 'warning',
        content: 'Large file detected. Processing may take longer.',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    }

    const reader = new FileReader();
    reader.onload = (e) => setText(e.target.result);
    reader.readAsText(file);
  }

  async function handleSave() {
    if (!result?.masked_text) return;

    const blob = new Blob([result.masked_text], { type: 'text/plain' });
    try {
      await fileSave(blob, {
        fileName: 'masked-output.txt',
        extensions: ['.txt']
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setNotifications([{
          type: 'error',
          content: 'Failed to save file',
          dismissible: true,
          onDismiss: () => setNotifications([])
        }]);
      }
    }
  }

  return (
    <SpaceBetween size="l">
      <Flashbar items={notifications} />

      <Container>
        <SpaceBetween size="l">
          <FormField
            label="Input text"
            description="Paste or type text containing sensitive data, or load from file"
          >
            <Textarea
              value={text}
              onChange={e => setText(e.detail.value)}
              rows={15}
              placeholder="Paste text here or load a file..."
            />
          </FormField>

          <SpaceBetween direction="horizontal" size="xs">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.csv,.yaml,.yml"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <Button
              iconName="upload"
              onClick={() => fileInputRef.current?.click()}
            >
              Load file
            </Button>
            <Button
              variant="primary"
              onClick={handleMask}
              loading={loading}
              disabled={!text.trim()}
            >
              Mask data
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </Container>

      {result && (
        <Container
          header={
            <SpaceBetween direction="horizontal" size="xs">
              <span>Masked output</span>
              <Button
                iconName="download"
                onClick={handleSave}
              >
                Save result
              </Button>
            </SpaceBetween>
          }
        >
          <FormField>
            <Textarea
              value={result.masked_text}
              readOnly
              rows={15}
            />
          </FormField>
        </Container>
      )}
    </SpaceBetween>
  );
}

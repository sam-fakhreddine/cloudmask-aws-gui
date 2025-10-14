import { useState, useRef } from 'react';
import {
  Container,
  FormField,
  Textarea,
  Button,
  SpaceBetween,
  Flashbar,
  Header,
  Badge,
  ColumnLayout
} from '@cloudscape-design/components';
import axios from 'axios';
import { fileSave } from 'browser-fs-access';

export function MaskingForm() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);
  const outputRef = useRef(null);

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

    setFileName({ name: file.name, size: (file.size / 1024).toFixed(1) });
    const reader = new FileReader();
    reader.onload = (e) => setText(e.target.result);
    reader.readAsText(file);
  }

  function handleClear() {
    setText('');
    setResult(null);
    setFileName(null);
  }

  async function handleCopy() {
    if (!result?.masked_text) return;
    try {
      await navigator.clipboard.writeText(result.masked_text);
      setNotifications([{
        type: 'success',
        content: 'Copied to clipboard',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: 'Failed to copy to clipboard',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    }
  }

  const charCount = text.length;
  const lineCount = text.split('\n').length;

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

      <ColumnLayout columns={2}>
        <Container 
          header={
            <Header
              variant="h2"
              actions={
                <Button 
                  iconName="remove" 
                  onClick={handleClear}
                  disabled={!text}
                >
                  Clear
                </Button>
              }
            >
              Input
            </Header>
          }
        >
          <SpaceBetween size="l">
            <FormField 
              description="Paste or type text containing sensitive data, or load from file"
              secondaryControl={
                fileName && (
                  <Badge color="blue">{fileName.name} ({fileName.size} KB)</Badge>
                )
              }
              constraintText={text && `${charCount.toLocaleString()} characters, ${lineCount} lines`}
            >
              <Textarea
                value={text}
                onChange={e => setText(e.detail.value)}
                rows={20}
                placeholder="Paste text here, load a file, or try Ctrl+V..."
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

        <Container 
          header={
            <Header
              variant="h2"
              actions={
                result && (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button 
                      iconName="copy" 
                      onClick={handleCopy}
                    >
                      Copy
                    </Button>
                    <Button
                      iconName="download"
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </SpaceBetween>
                )
              }
              info={result && <Badge color="green">{result.items_masked} items masked in {result.processing_time_ms.toFixed(1)}ms</Badge>}
            >
              Output
            </Header>
          }
        >
          <SpaceBetween size="l">
            <FormField description={result ? 'Masked data ready' : 'Masked data will appear here after clicking "Mask data"'}>
              <Textarea
                value={result?.masked_text || ''}
                readOnly
                rows={20}
                placeholder="🔒 Masked output will appear here after processing..."
                ref={outputRef}
              />
            </FormField>


          </SpaceBetween>
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
}

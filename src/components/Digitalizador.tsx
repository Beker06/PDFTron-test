import React, { useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { PDFDocument } from 'pdf-lib';

interface SplitFile {
    name: string;
    size: number;
    url: string;
}

const Digitalizador = () => {

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [splitFiles, setSplitFiles] = useState<SplitFile[]>([]);
    const MAX_CHUNK_SIZE = 2.7 * 1024 * 1024; // 2.7MB

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const splitPDF = async (file: File) => {
        try {
            const fileBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(fileBuffer, {
                parseSpeed: 100,
                ignoreEncryption: true,
                updateMetadata: false
            });
            const numberOfPages = pdfDoc.getPageCount();
            const avgPageSize = file.size / numberOfPages;
            const pagesPerChunk = Math.floor(MAX_CHUNK_SIZE / avgPageSize);
            const totalChunks = Math.ceil(numberOfPages / pagesPerChunk);
            const newSplitFiles: SplitFile[] = [];

            console.log("Archivo", pdfDoc);
            console.log(`
                Tamaño de PDF: ${formatFileSize(file.size)}
                Paginas totales de pdf: ${numberOfPages}
                Average Page Size: ${formatFileSize(avgPageSize)}
                Maximo Tamaño de Chunk(2.7): ${formatFileSize(MAX_CHUNK_SIZE)} 
                Paginas por chunk: ${pagesPerChunk}
                Chunks Totales: ${totalChunks}
            `)

            for (let i = 0; i < totalChunks; i++) {
                const newPdfDoc = await PDFDocument.create({
                    updateMetadata: false
                });

                const startIdx = i * pagesPerChunk;
                const endIdx = Math.min((i + 1) * pagesPerChunk, numberOfPages);
                for (let pageIdx = startIdx; pageIdx < endIdx; pageIdx++) {
                    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIdx]);
                    newPdfDoc.addPage(copiedPage);
                }

                if (newPdfDoc.getPageCount() > 0) {
                    const pdfBytes = await newPdfDoc.save({
                        useObjectStreams: false,
                        updateFieldAppearances: false,
                    });
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    newSplitFiles.push({
                        name: `${file.name.split('.')[0]}_part${i + 1}.pdf`,
                        size: blob.size,
                        url: url,
                    });
                }
            }

            setSplitFiles(newSplitFiles);
        } catch (error) {
            console.error('Error splitting PDF:', error);
            alert('Error splitting PDF. Please try again.');
        }
    };

    const splitFile = async (file: File) => {
        await splitPDF(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSplitFiles([]);
        }
    };

    const handleSplit = () => {
        if (selectedFile) {
            splitFile(selectedFile);
        }
    };

    const downloadSplitFile = (splitFile: SplitFile) => {
        const link = document.createElement('a');
        link.href = splitFile.url;
        link.download = splitFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllFiles = () => {
        splitFiles.forEach(file => downloadSplitFile(file));
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const file = event.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSplitFiles([]);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* File Input Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                <Paper
                    variant="outlined"
                    // component="label"
                    sx={{
                        width: '100%',
                        maxWidth: 600,
                        height: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        '&:hover': {
                            borderColor: 'primary.dark',
                            bgcolor: 'action.hover',
                        },
                    }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        hidden
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" color="primary" gutterBottom>
                        Drag and drop your file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        or click to select a file
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Supported formats: PDF, JPG, PNG
                    </Typography>
                </Paper>

                {selectedFile && (
                    <Button
                        variant="contained"
                        onClick={handleSplit}
                        sx={{ mt: 2 }}
                    >
                        SPLIT FILE
                    </Button>
                )}
            </Box>

            {/* Single Accordion for Original + Split Files */}
            {selectedFile && (
                <Accordion defaultExpanded>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="file-content"
                        id="file-header"
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <InsertDriveFileIcon sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="subtitle1">{selectedFile.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Original File • {formatFileSize(selectedFile.size)}
                                    </Typography>
                                </Box>
                            </Box>
                            {splitFiles.length > 0 && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAllFiles();
                                    }}
                                    sx={{ mr: 2 }}
                                >
                                    Download all
                                </Button>
                            )}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        {splitFiles.length > 0 ? (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Nombre</TableCell>
                                            <TableCell>Tamaño</TableCell>
                                            <TableCell>E-Document</TableCell>
                                            <TableCell align="right">Acción</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {splitFiles.map((file, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <InsertDriveFileIcon sx={{ mr: 1 }} />
                                                        {file.name}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{formatFileSize(file.size)}</TableCell>
                                                <TableCell>No</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        onClick={() => downloadSplitFile(file)}
                                                        title="Descargar"
                                                    >
                                                        <DownloadIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                Click "SPLIT FILE" to generate split files
                            </Typography>
                        )}
                    </AccordionDetails>
                </Accordion>
            )}
        </Container>
    );
}

export default Digitalizador
/**
 * Bitstream API
 * Handles bitstream operations, downloads, and uploads
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";
import axios from "axios";
import { PDFDocument, PDFImage } from "pdf-lib";
import html2canvas from "html2canvas";
import logoImage from "@/assets/images/logo.png";


export interface Bitstream {
  id: string;
  uuid: string;
  name: string;
  sizeBytes: number;
  checkSum?: {
    value: string;
    checkSumAlgorithm: string;
  };
  sequenceId?: number;
  format?: string;
  mimeType?: string;
  _links?: {
    content?: { href: string };
    self?: { href: string };
  };
}

export interface BitstreamListResponse {
  bitstreams: Bitstream[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch bitstreams in a bundle
 */
export const fetchBundleBitstreams = async (
  bundleId: string,
  page: number = 0,
  size: number = 100
): Promise<BitstreamListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/bundles/${bundleId}/bitstreams?page=${page}&size=${size}`
    );

    const bitstreams = response.data._embedded?.bitstreams || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: bitstreams.length,
      totalPages: 1,
      number: page,
    };

    return {
      bitstreams: bitstreams.map((b: any) => ({
        id: b.id,
        uuid: b.uuid || b.id,
        name: b.name,
        sizeBytes: b.sizeBytes,
        checkSum: b.checkSum,
        sequenceId: b.sequenceId,
        format: b.format,
        mimeType: b.mimeType,
        _links: b._links,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("Fetch bundle bitstreams error:", error);
    throw error;
  }
};

/**
 * Upload bitstream to bundle
 */
export const uploadBitstream = async (
  bundleId: string,
  file: File
): Promise<Bitstream> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
      `/api/core/bundles/${bundleId}/bitstreams`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      sizeBytes: response.data.sizeBytes,
      checkSum: response.data.checkSum,
      sequenceId: response.data.sequenceId,
      format: response.data.format,
      mimeType: response.data.mimeType,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Upload bitstream error:", error);
    throw error;
  }
};

/**
 * Download bitstream content
 */
export const downloadBitstream = async (
  bitstreamId: string,
  fileName: string
): Promise<void> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    const response = await axios.get(
      `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`,
      {
        headers: {
          Authorization: authToken || "",
        },
        responseType: "blob",
        withCredentials: true,
      }
    );

    // Create blob URL and trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download bitstream error:", error);
    throw error;
  }
};

/**
 * Get bitstream content URL (for display in browser)
 */
export const getBitstreamContentUrl = (bitstreamId: string): string => {
  return `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`;
};

/**
 * Fetch bitstream content as blob (for preview)
 */
export const fetchBitstreamContent = async (
  bitstreamId: string
): Promise<Blob> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    const response = await axios.get(
      `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`,
      {
        headers: {
          Authorization: authToken || "",
        },
        responseType: "blob",
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Fetch bitstream content error:", error);
    throw error;
  }
};

/**
 * Delete bitstream
 */
export const deleteBitstream = async (bitstreamId: string): Promise<boolean> => {
  try {
    await axiosInstance.patch("/api/core/bitstreams", [
      {
        op: "remove",
        path: `/bitstreams/${bitstreamId}`,
      },
    ]);

    return true;
  } catch (error) {
    console.error("Delete bitstream error:", error);
    throw error;
  }
};

/**
 * Update bitstream metadata
 */
export const updateBitstreamMetadata = async (
  bitstreamId: string,
  metadata: Record<string, any>
): Promise<Bitstream> => {
  try {
    const operations = Object.entries(metadata).map(([key, value]) => ({
      op: "replace",
      path: `/${key}`,
      value: value,
    }));

    const response = await axiosInstance.patch(
      `/api/core/bitstreams/${bitstreamId}`,
      operations
    );

    return {
      id: response.data.id,
      uuid: response.data.uuid || response.data.id,
      name: response.data.name,
      sizeBytes: response.data.sizeBytes,
      checkSum: response.data.checkSum,
      sequenceId: response.data.sequenceId,
      format: response.data.format,
      mimeType: response.data.mimeType,
      _links: response.data._links,
    };
  } catch (error) {
    console.error("Update bitstream metadata error:", error);
    throw error;
  }
};

/**
 * Parse page string (e.g., "1-3,5,7-10" => [1,2,3,5,7,8,9,10])
 */
const parsePages = (pageString: string): number[] => {
  const pages = new Set<number>();

  pageString.split(",").forEach((part) => {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      }
    } else {
      const page = Number(part);
      if (!isNaN(page)) {
        pages.add(page);
      }
    }
  });

  return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Build metadata table HTML for cover page
 */
const buildMetadataHTML = (itemData: any, logoUrl: string): string => {
  const metadataMap: { [key: string]: string } = {
    // Medical Records
    "dc.uhidno": "UHID Number",
    "dc.patientname": "Patient Name",
    "dc.doctorname": "Doctor Name",
    "dc.mrdno": "MRD NO",
    "dc.mlc": "MLC",
    "dc.dod": "Date Of Discharge",
    "dc.filetype": "File Type",
    "dc.speciality": "Speciality",
    // HR Records
    "dc.employeecode": "Employee ID",
    "dc.employeename": "Employee Name",
    "dc.employeetype": "Employee Type",
    "dc.joiningyear": "Joining Year",
    "dc.post": "Post",
    "dc.joiningdate": "Date Of Joining",
    "dc.companycode": "Company Code",
    "dc.unitcode": "Unit Code",
    "dc.departmentname": "Department",
    "dc.employeecategory": "Employee Category",
    // Procurement & Contract
    "dc.assetid": "Asset ID",
    "dc.invoiceNumber": "Invoice Number",
    "dc.VendorName": "Vendor Name",
    "dc.ContractStatus": "Contract Status",
    "dc.ContractOwner": "Contract Owner",
    "dc.ContractValue": "Contract Value",
    "dc.Material": "Material",
    "dc.PaymentTerms": "Payment Terms",
    "dc.Quantity": "Quantity",
    "dc.TotalValue": "Total Value",
    "dc.UnitPrice": "Unit Price",
    "dc.hrDocNo": "HR Document Number",
    // Document/Common
    "dc.contributor.author": "Author",
    "dc.organization": "Organization",
    "dc.DocType": "Document Type",
    "dc.Status": "Status",
    "dc.EmpName": "Employee Name",
    "dc.description.abstract": "Diagnosis",
    "dc.subject": "Subject",
    "dc.date.issued": "Issued Date",
    "dspace.entity.type": "Entity Type",
    "dc.date.created": "Date Created",
    "dc.filenumber": "File Number",
    "dc.publisher": "Publisher",
    "dc.title": "Title",
    "dc.description": "Description",
    "dc.type": "Type",
    "dc.identifier.uri": "URI",
    "dc.identifier.doi": "DOI",
    "dc.language.iso": "Language",
    "dc.rights": "Rights",
    "dc.format.extent": "Format",
  };

  let rows = `
    <tr>
      <th style="background:linear-gradient(135deg,#34495e 0%,#2c3e50 100%);color:#fff;padding:4px 5px;width:160px;text-align:left;word-wrap:break-word;word-break:break-word;font-size:10px;font-weight:bold;letter-spacing:0.5px;">Field</th>
      <th style="background:linear-gradient(135deg,#34495e 0%,#2c3e50 100%);color:#fff;padding:4px 5px;text-align:left;word-wrap:break-word;word-break:break-word;font-size:10px;font-weight:bold;letter-spacing:0.5px;">Value</th>
    </tr>
  `;

  let rowCount = 0;
  Object.entries(metadataMap).forEach(([key, label]) => {
    const value = itemData?.metadata?.[key]?.[0]?.value;
    if (value) {
      const bgColor = rowCount % 2 === 0 ? "#f8f9fa" : "#fff";
      rows += `
        <tr>
          <td style="background:${bgColor};padding:4px 6px;border-bottom:1px solid #e0e0e0;font-weight:600;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;font-size:9px;color:#2c3e50;line-height:1.3;">${label}</td>
          <td style="background:${bgColor};padding:4px 6px;border-bottom:1px solid #e0e0e0;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;font-size:9px;color:#1a1a1a;line-height:1.3;">${value}</td>
        </tr>
      `;
      rowCount++;
    }
  });

  return `
    <div style="width:380px;height:650px;padding:15px;background:#fff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">
      <div style="text-align:center;margin-bottom:20px;display:flex;justify-content:center;">
        <img src="${logoUrl}" style="height:70px;width:auto;display:block;margin:0 auto;object-fit:contain;" />
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="margin:0;color:#2c3e50;font-size:16px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Document Details</h2>
        <div style="height:2px;background:linear-gradient(90deg,transparent,#34495e,transparent);margin-top:8px;"></div>
      </div>
      <div style="flex:1;overflow:auto;display:flex;justify-content:center;">
        <table style="width:95%;border-collapse:collapse;border:2px solid #34495e;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${rows}
        </table>
      </div>
      <div style="text-align:center;margin-top:15px;font-size:8px;color:#bbb;border-top:1px solid #e0e0e0;padding-top:10px;">
        <p style="margin:2px 0;">Generated on ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;
};

/**
 * Get logo URL from imported assets
 */
const getLogoUrl = (): string => {
  return logoImage;
};

/**
 * Create metadata cover page
 */
const createMetadataPage = async (
  outPdf: PDFDocument,
  itemId: string | null | undefined
): Promise<boolean> => {
  if (!itemId) return false;

  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    // Fetch item metadata
    const itemResp = await axios.get(
      `${siteConfig.apiEndpoint}/api/core/items/${itemId}`,
      {
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
      }
    );

    const logoUrl = getLogoUrl();
    const htmlContent = buildMetadataHTML(itemResp.data, logoUrl);

    // Create temporary div
    const temp = document.createElement("div");
    temp.innerHTML = htmlContent;
    temp.style.position = "absolute";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);

    // Convert HTML to canvas
    const canvas = await html2canvas(temp, {
      backgroundColor: "#ffffff",
      allowTaint: true,
      useCORS: true,
      scale: 2,
      logging: false,
      width: 380,
      height: 650,
      windowWidth: 380,
      windowHeight: 650,
    });

    document.body.removeChild(temp);

    // Convert canvas to image
    const imgData = canvas.toDataURL("image/png");
    const imgBytes = await fetch(imgData).then((r) => r.arrayBuffer());

    // Embed image in PDF
    const imgEmbed = await outPdf.embedPng(imgBytes);
    const page = outPdf.addPage([imgEmbed.width, imgEmbed.height]);

    page.drawImage(imgEmbed, {
      x: 0,
      y: 0,
      width: imgEmbed.width,
      height: imgEmbed.height,
    });

    return true;
  } catch (error) {
    console.error("Error creating metadata page:", error);
    return false;
  }
};

/**
 * Apply logo watermark to page
 */
const applyLogoWatermark = async (
  page: any,
  logoUrl: string
): Promise<void> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    // Fetch logo image
    const logoResp = await fetch(logoUrl, {
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : "",
      },
    });

    if (!logoResp.ok) return;

    const logoBlob = await logoResp.blob();
    const arrayBuffer = await logoBlob.arrayBuffer();

    // Determine image type and embed
    const contentType = logoBlob.type.toLowerCase();
    const pdfDoc = page.doc || (page as any).pdfDoc;

    let logoImg: PDFImage;
    if (contentType.includes("png")) {
      logoImg = await pdfDoc.embedPng(arrayBuffer);
    } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      logoImg = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      return; // Unsupported format
    }

    // Calculate watermark size (30% of logo)
    const wmWidth = logoImg.width * 0.3;
    const wmHeight = logoImg.height * 0.3;

    // Get page size
    const { width, height } = page.getSize();

    // Center position
    const x = (width - wmWidth) / 2;
    const y = (height - wmHeight) / 2;

    // Draw watermark with 20% opacity (lighter)
    page.drawImage(logoImg, {
      x,
      y,
      width: wmWidth,
      height: wmHeight,
      opacity: 0.2,
    });
  } catch (error) {
    console.error("Error applying watermark:", error);
    
  }
};

/**
 * Download PDF with metadata cover page and optional logo watermark
 * @param bitstreamId - The bitstream ID to download
 * @param fileName - File name for download
 * @param itemId - Item ID for metadata cover page (optional)
 * @param pagesStr - Optional page range (e.g., "1-3,5,7-10")
 * @param includeWatermark - Whether to add logo watermark
 */
export const downloadPDFWithWatermark = async (
  bitstreamId: string,
  fileName: string,
  itemId?: string | null,
  pagesStr?: string | null,
  includeWatermark: boolean = false
): Promise<void> => {
  try {
    const authToken = localStorage.getItem(siteConfig.auth.tokenKey);

    // STEP 1: Fetch the original PDF
    const pdfResp = await axios.get(
      `${siteConfig.apiEndpoint}/api/core/bitstreams/${bitstreamId}/content`,
      {
        headers: {
          Authorization: authToken || "",
        },
        responseType: "arraybuffer",
        withCredentials: true,
      }
    );

    const pdfBytes = await PDFDocument.load(pdfResp.data);
    const pageCount = pdfBytes.getPageCount();
    const outPdf = await PDFDocument.create();

    // STEP 2: Create metadata cover page if itemId provided
    if (itemId) {
      await createMetadataPage(outPdf, itemId);
    }

    // STEP 3: Parse page selection
    const requestedPages = pagesStr
      ? parsePages(pagesStr)
      : Array.from({ length: pageCount }, (_, i) => i + 1);

    const logoUrl = getLogoUrl();

    // STEP 4-5: Copy pages with watermark
    for (const pageNum of requestedPages) {
      if (pageNum < 1 || pageNum > pageCount) continue;

      const pages = await outPdf.copyPages(pdfBytes, [pageNum - 1]);
      const page = pages[0];

      // Apply watermark if requested
      if (includeWatermark) {
        await applyLogoWatermark(page, logoUrl);
      }

      outPdf.addPage(page);
    }

    // STEP 6: Download
    const pdfData = await outPdf.save();
    const blob = new Blob([pdfData as any], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF download error:", error);
    throw error;
  }
};

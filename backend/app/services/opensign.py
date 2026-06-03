import httpx
import os
from typing import Optional


class OpenSignService:
    """
    OpenSign API client. OpenSign uses Parse Server REST API conventions.
    Set OPENSIGN_ENABLED=true and provide credentials to activate.
    """

    def __init__(self):
        self.enabled = os.getenv("OPENSIGN_ENABLED", "false").lower() == "true"
        self.base_url = os.getenv("OPENSIGN_URL", "").rstrip("/")
        self.app_id = os.getenv("OPENSIGN_APP_ID", "")
        self.api_key = os.getenv("OPENSIGN_API_KEY", "")
        self.folder_id = os.getenv("OPENSIGN_FOLDER_ID", "")

    def _headers(self) -> dict:
        return {
            "X-Parse-Application-Id": self.app_id,
            "X-Parse-REST-API-Key": self.api_key,
            "Content-Type": "application/json",
        }

    async def create_signing_request(
        self,
        document_name: str,
        signer_name: str,
        signer_email: str,
        template_id: Optional[str] = None,
    ) -> dict:
        """
        Creates a document in OpenSign and returns document_id and sign_url.
        Returns {"document_id": str, "sign_url": str} or raises on failure.
        """
        if not self.enabled:
            raise RuntimeError("OpenSign integration is not enabled")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Build signer payload
            signer = {
                "name": signer_name,
                "email": signer_email,
                "signerObjId": signer_email,
                "order": 1,
            }

            payload: dict = {
                "title": document_name,
                "signers": [signer],
                "sendInOrder": False,
                "note": f"Please sign the consent form: {document_name}",
            }

            if template_id:
                payload["templateId"] = template_id
            if self.folder_id:
                payload["folderId"] = self.folder_id

            resp = await client.post(
                f"{self.base_url}/1/functions/createDocFromTemplate",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json().get("result", {})

            return {
                "document_id": data.get("objectId", ""),
                "sign_url": data.get("signUrl", ""),
            }

    async def get_document_status(self, document_id: str) -> str:
        """Returns status string: completed | pending | declined | expired"""
        if not self.enabled:
            raise RuntimeError("OpenSign integration is not enabled")

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.base_url}/1/classes/contracts_Document/{document_id}",
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            # OpenSign uses IsSendWithOrder and status fields
            is_completed = data.get("IsCompleted", False)
            is_declined = data.get("IsDeclined", False)
            if is_completed:
                return "signed"
            if is_declined:
                return "declined"
            return "sent"

    async def send_reminder(self, document_id: str) -> bool:
        if not self.enabled:
            raise RuntimeError("OpenSign integration is not enabled")

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/1/functions/remindDocument",
                json={"docId": document_id},
                headers=self._headers(),
            )
            return resp.status_code == 200


opensign = OpenSignService()

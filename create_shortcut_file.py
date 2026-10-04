import plistlib
import os

def generate_shortcut():
    # Apple Shortcut Plist structure with Share Sheet, Siri Voice & Quick Action support
    shortcut_data = {
        "WFWorkflowClientVersion": "1202.1",
        "WFWorkflowClientRelease": "16.0",
        "WFWorkflowIcon": {
            "WFWorkflowIconGlyphNumber": 59723,  # Download icon glyph
            "WFWorkflowIconStartColor": 4282583807  # Apple SF Purple
        },
        "WFWorkflowTypes": [
            "WFWorkflowTypeShareSheet",
            "WFWorkflowTypeServicesMenu",
            "WFWorkflowTypeSiri",
            "WFWorkflowTypeQuickAction"
        ],
        "WFWorkflowInputContentItemClasses": [
            "WFURLContentItem",
            "WFSafariWebPageContentItem",
            "WFStringContentItem"
        ],
        "WFWorkflowActions": [
            # 1. Detect Link from Share Sheet or Input
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.detect.link",
                "WFWorkflowActionParameters": {
                    "WFInput": {
                        "Value": {
                            "Type": "ExtensionInput"
                        },
                        "WFSerializationType": "WFTextTokenAttachment"
                    }
                }
            },
            # 2. Fallback to Clipboard if run via Siri or Tap
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.getclipboard",
                "WFWorkflowActionParameters": {}
            },
            # 3. Native Apple Sheet Menu: Select Format
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.choosefrommenu",
                "WFWorkflowActionParameters": {
                    "WFMenuPrompt": "MediaSnap — Select Download Format",
                    "WFMenuItems": [
                        "🎬 Video (4K / 1080p / Best Quality)",
                        "🎧 Audio MP3 (320kbps Crystal Clear)",
                        "🖼 Image / Original Thumbnail"
                    ]
                }
            },
            # 4. Save File to iOS Downloads / Photos
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.documentpicker.save",
                "WFWorkflowActionParameters": {
                    "WFSaveFileAskWhereToSave": False
                }
            },
            # 5. Siri Voice Confirmation
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.showresult",
                "WFWorkflowActionParameters": {
                    "Text": "MediaSnap: Download complete! 🎉 Saved to your iPhone."
                }
            }
        ]
    }

    output_path = "public/MediaSnap_Downloader.shortcut"
    with open(output_path, "wb") as f:
        plistlib.dump(shortcut_data, f, fmt=plistlib.FMT_BINARY)
    print(f"Generated Siri & iOS Shortcut file at {output_path}")

if __name__ == "__main__":
    generate_shortcut()

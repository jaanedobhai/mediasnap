import plistlib
import os

def generate_shortcut():
    # Build a complete Apple Shortcut Plist structure
    shortcut_data = {
        "WFWorkflowClientVersion": "1202.1",
        "WFWorkflowClientRelease": "15.0",
        "WFWorkflowIcon": {
            "WFWorkflowIconGlyphNumber": 59723,  # Download icon
            "WFWorkflowIconStartColor": 4282583807  # Purple color
        },
        "WFWorkflowTypes": [
            "WFWorkflowTypeShareSheet"
        ],
        "WFWorkflowInputContentItemClasses": [
            "WFURLContentItem",
            "WFSafariWebPageContentItem",
            "WFStringContentItem"
        ],
        "WFWorkflowActions": [
            # 1. Get Shortcut Input
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
            # 2. If no input, get Clipboard
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.getclipboard",
                "WFWorkflowActionParameters": {}
            },
            # 3. Choose Media Type Menu
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.choosefrommenu",
                "WFWorkflowActionParameters": {
                    "WFMenuPrompt": "MediaSnap: Choose Type to Download",
                    "WFMenuItems": [
                        "🎬 Video (Best / 4K / 1080p)",
                        "🎧 Audio MP3 (320kbps)",
                        "🖼 Image / Original Thumbnail"
                    ]
                }
            }
        ]
    }

    output_path = "public/MediaSnap_Downloader.shortcut"
    with open(output_path, "wb") as f:
        plistlib.dump(shortcut_data, f, fmt=plistlib.FMT_BINARY)
    print(f"Generated iOS Shortcut file at {output_path}")

if __name__ == "__main__":
    generate_shortcut()

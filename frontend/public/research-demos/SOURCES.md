# Research demo sources

These three 20-second clips were extracted from the bounded `test.zip` evaluation configuration in the [`jinmang2/ucf_crime`](https://huggingface.co/datasets/jinmang2/ucf_crime) research mirror. The corresponding descriptions and timestamps come from [`Xuange923/Surveillance-Video-Understanding`](https://github.com/Xuange923/Surveillance-Video-Understanding).

| Demo | Source | Processing |
| --- | --- | --- |
| `arrest-low-160x120.webm` | `Arrest002_x264.mp4` | First 20 seconds, downscaled from 320×240 |
| `arson-native-320x240.webm` | `Arson003_x264.mp4` | First 20 seconds, native 320×240 |
| `normal-upscaled-640x480.webm` | `Normal_Videos_050_x264.mp4` | First 20 seconds, upscaled from 320×240 |

The variants test resolution sensitivity and are not model-training inputs. Upscaling does not restore visual detail. The UCA repository describes its annotations as Apache-2.0 and academic/research material; the Hugging Face mirror identifies UCF-Crime as CC0.

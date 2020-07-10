# Katalon Studio Github Action

This action allows you to run Katalon Studio projects.

> Katalon TestOps CI is an easier way to execute Katalon Studio tests remotely or schedule remote Katalon Studio execution. [Learn more](https://docs.katalon.com/katalon-analytics/docs/kt-remote-execution.html)

## Example usage

Setup API Key using Secret name: `API_KEY`.

```yaml
name: CI
on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  build:
    runs-on: windows-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v2.2
    - name: Katalon Studio Github Action
      uses: katalon-studio/katalon-studio-github-action@v2
      with:
          version: '7.5.5'
          projectPath: '${{ github.workspace }}'
          args: '-noSplash -retry=0 -testSuiteCollectionPath="Test Suites/Simple Test Suite Collection" -apiKey= ${{ secrets.API_KEY }} --config -webui.autoUpdateDrivers=true'
```

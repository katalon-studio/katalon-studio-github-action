# Katalon Studio action test

This action to run KS test and with your test cases source codes. 

## Inputs

### `your katalon command `

**Required** the katalon commands and test cases files 

## Outputs

### `status`

done

## Example usage


```yaml
uses: actions/katalonstudion@v1
with:
  ks_command: '-browserType="Chrome" -retry=0 -statusDelay=15 -testSuitePath="Test Suites/TS_RegressionTest"'
  ks_api_key: ''
```
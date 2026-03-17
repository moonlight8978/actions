# github-app-login

A composite action that logs in as a GitHub App and provides the necessary
credentials for authenticating, including the token, bot username, bot email,
and bot user ID. This is particularly useful when you need an action to make
commits or interact with repositories as a GitHub App bot.

## Usage

```yaml
steps:
  - name: Login to GitHub App
    id: ghapp-auth
    uses: moonlight8978/actions/.github/actions/github-app-login@main
    with:
      app-id: ${{ secrets.GH_APP_ID }}
      private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}

  - name: Checkout repository
    uses: actions/checkout@v4
    with:
      token: ${{ steps.ghapp-auth.outputs.token }}

  - name: Setup Git User
    run: |
      git config --global user.name "${{ steps.ghapp-auth.outputs.bot-name }}"
      git config --global user.email "${{ steps.ghapp-auth.outputs.bot-email }}"
```

## Inputs

| Name          | Description            | Required | Default |
| :------------ | :--------------------- | :------- | :------ |
| `app-id`      | GitHub App ID          | Yes      | N/A     |
| `private-key` | GitHub App Private Key | Yes      | N/A     |

## Outputs

| Name        | Description        |
| :---------- | :----------------- |
| `token`     | GitHub App Token   |
| `user-id`   | GitHub App User ID |
| `bot-name`  | bot username       |
| `bot-email` | bot email          |
